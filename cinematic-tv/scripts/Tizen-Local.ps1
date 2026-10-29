#requires -Version 5.1
<#
Local SDK helper. No certificates/passwords are copied or uploaded.
Signature inspection checks package contents and certificate metadata, not Samsung trust.
A successful real-TV installation is the certificate-authorisation acceptance gate.
#>
[CmdletBinding()]
param(
    [ValidateSet('Doctor','Sign','Install','Run')][string]$Action = 'Doctor',
    [string]$SdkRoot = '',
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_. -]{0,63}$')][string]$CertificateProfile = '',
    [string]$TvAddress = '',
    [string]$WgtPath = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$AppId = 'CinemTV001.Launcher'
$PackageId = 'CinemTV001'
$Meta = Get-Content (Join-Path $ProjectRoot 'package.json') -Raw | ConvertFrom-Json
$Version = [string]$Meta.version
$ManifestPath = Join-Path $ProjectRoot 'dist/BUILD-MANIFEST.json'
$SignedDirectory = Join-Path $ProjectRoot 'signed'
$DefaultWgt = Join-Path $SignedDirectory "Cinematic-TV-$Version.wgt"

function Get-SdkTools {
    $candidates = @()
    if ($SdkRoot) { $candidates += $SdkRoot }
    else {
        if ($env:TIZEN_SDK_ROOT) { $candidates += $env:TIZEN_SDK_ROOT }
        if ($env:TIZEN_STUDIO_HOME) { $candidates += $env:TIZEN_STUDIO_HOME }
        $candidates += 'C:\tizen-studio'
        $candidates += (Join-Path $HOME 'tizen-studio')
        $onPath = Get-Command 'tizen.bat' -ErrorAction SilentlyContinue
        if ($onPath) { $candidates += (Split-Path (Split-Path (Split-Path (Split-Path $onPath.Source -Parent) -Parent) -Parent) -Parent) }
    }
    foreach ($candidate in $candidates) {
        $cli = Join-Path $candidate 'tools/ide/bin/tizen.bat'
        $sdb = Join-Path $candidate 'tools/sdb.exe'
        if ((Test-Path -LiteralPath $cli -PathType Leaf) -and (Test-Path -LiteralPath $sdb -PathType Leaf)) {
            return @{ Tizen = (Resolve-Path -LiteralPath $cli).Path; Sdb = (Resolve-Path -LiteralPath $sdb).Path }
        }
    }
    throw 'Tizen Web CLI/SDB not found. Use -SdkRoot C:\tizen-studio and install Web CLI in Package Manager.'
}
function Invoke-Checked {
    param([string]$Executable,[string[]]$Arguments)
    # The profile name is a non-secret identifier. Never pass a password to this helper.
    & $Executable @Arguments | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "SDK command failed (exit $LASTEXITCODE). Review the local SDK output above." }
}
function Read-SafeXml {
    param([string]$Text)
    $settings = New-Object System.Xml.XmlReaderSettings
    $settings.DtdProcessing = [System.Xml.DtdProcessing]::Prohibit
    $settings.XmlResolver = $null
    $reader = [System.Xml.XmlReader]::Create((New-Object System.IO.StringReader($Text)), $settings)
    try { $document = New-Object System.Xml.XmlDocument; $document.XmlResolver = $null; $document.Load($reader); return ,$document }
    finally { $reader.Dispose() }
}
function Get-SourceManifest {
    if (-not (Test-Path -LiteralPath $ManifestPath)) { throw 'Missing dist/BUILD-MANIFEST.json. Run npm run build, or extract the complete supplied candidate ZIP.' }
    $manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
    if ($manifest.name -ne 'cinematic-tv-launcher' -or $manifest.version -ne $Version) { throw 'Build manifest version/identity mismatch.' }
    $seen = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($file in $manifest.files) {
        if ($file.path -notmatch '^[A-Za-z0-9_-]+(?:/[A-Za-z0-9_.-]+)+$|^(config.xml|index.html)$' -or $file.path -match '(^|/)\.\.?(/|$)' -or -not $seen.Add([string]$file.path)) { throw 'Unsafe or duplicate manifest path.' }
        if ($file.sha256 -notmatch '^[0-9a-f]{64}$') { throw 'Invalid source digest.' }
        $source = Join-Path (Join-Path $ProjectRoot 'src') $file.path
        if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Missing source: $($file.path)" }
        if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256) { throw "Source changed: $($file.path). Re-run npm run verify and npm run build before signing." }
    }
    return $manifest
}
function Read-EntryBytes {
    param($Entry)
    if ($Entry.Length -gt 16777216) { throw 'Unexpectedly large package entry.' }
    $stream=$Entry.Open();$memory=New-Object System.IO.MemoryStream
    try { $stream.CopyTo($memory); return ,$memory.ToArray() }
    finally { $stream.Dispose();$memory.Dispose() }
}
function Get-ByteHash {
    param([byte[]]$Bytes)
    $hash=[System.Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($hash.ComputeHash($Bytes))).Replace('-','').ToLowerInvariant() }
    finally { $hash.Dispose() }
}
function Test-SignedPackage {
    param([string]$Path)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $manifest=Get-SourceManifest
    $zip=[System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Path).Path)
    try {
        $entries=@{};$total=0L
        foreach ($entry in $zip.Entries) {
            $name=$entry.FullName
            if ($entries.ContainsKey($name) -or $name -match '(^/|\\|(^|/)\.\.(/|$)|\.(p12|pfx|key|pem)$)') { throw 'Duplicate, unsafe or private-key package entry.' }
            $total += $entry.Length
            if ($total -gt 67108864) { throw 'Package exceeds the 64 MiB inspection limit.' }
            $entries[$name]=$entry
        }
        foreach ($file in $manifest.files) {
            if (-not $entries.ContainsKey($file.path)) { throw "Package is missing $($file.path)." }
            if ((Get-ByteHash (Read-EntryBytes $entries[$file.path])) -ne $file.sha256) { throw "SDK output differs from reviewed source: $($file.path). Stop and investigate before installing." }
        }
        $config=Read-SafeXml ([Text.Encoding]::UTF8.GetString((Read-EntryBytes $entries['config.xml'])))
        $app=$config.GetElementsByTagName('application','http://tizen.org/ns/widgets')
        if ($config.DocumentElement.GetAttribute('version') -ne $Version -or $app.Count -ne 1 -or $app[0].GetAttribute('id') -ne $AppId -or $app[0].GetAttribute('package') -ne $PackageId) { throw 'Unexpected TV app identity.' }
        $fingerprints=@{}
        foreach ($signature in @('author-signature.xml','signature1.xml')) {
            if (-not $entries.ContainsKey($signature)) { throw "Unsigned/incomplete WGT: $signature is missing." }
            $xml=Read-SafeXml ([Text.Encoding]::UTF8.GetString((Read-EntryBytes $entries[$signature])))
            $certs=$xml.GetElementsByTagName('X509Certificate','http://www.w3.org/2000/09/xmldsig#')
            if ($certs.Count -lt 1) { throw "No signing certificate in $signature." }
            $raw=[Convert]::FromBase64String($certs[0].InnerText)
            $certificate=New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 -ArgumentList (,$raw)
            try {
                if ((Get-Date) -lt $certificate.NotBefore -or (Get-Date) -gt $certificate.NotAfter) { throw "Signing certificate in $signature is outside its validity period." }
                $fingerprints[$signature]=Get-ByteHash $raw
            } finally { $certificate.Dispose() }
        }
        Write-Host "Payload, version and signature certificate metadata checked. Samsung trust/DUID acceptance is verified by the TV, not by this inspection."
        return @{ Sha256=(Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant(); AuthorCertificateSha256=$fingerprints['author-signature.xml']; DistributorCertificateSha256=$fingerprints['signature1.xml'] }
    } finally { $zip.Dispose() }
}
function Get-TvSerial {
    if (-not $TvAddress) { throw 'Supply the TV IP with -TvAddress. This helper never scans your network.' }
    $ip=$null
    if (-not [System.Net.IPAddress]::TryParse($TvAddress,[ref]$ip) -or $ip.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { throw 'Use the TV IPv4 address shown in its network settings.' }
    $serial="${TvAddress}:26101"
    Invoke-Checked $tools.Sdb @('connect',$serial)
    $devices=& $tools.Sdb devices
    if ($LASTEXITCODE -ne 0) { throw 'SDB could not list connected devices.' }
    if (-not ($devices | Where-Object { $_ -match ('^'+[regex]::Escape($serial)+'\s+device\b') })) { throw 'The exact target is not an authorised SDB device. Check Developer Mode, host PC IP, firewall and Device Manager.' }
    return $serial
}

try {
    $tools=Get-SdkTools
    if ($Action -eq 'Doctor') {
        Invoke-Checked $tools.Tizen @('version')
        Invoke-Checked $tools.Tizen @('security-profiles','list')
        Invoke-Checked $tools.Sdb @('devices')
        $null=Get-SourceManifest
        Write-Host 'Source hashes verified. Choose a Samsung TV profile with your TV DUID, then use -Action Sign.'
        exit 0
    }
    if ($Action -eq 'Sign') {
        if (-not $CertificateProfile) { throw 'Use -CertificateProfile with the name shown in Samsung Certificate Manager.' }
        $manifest=Get-SourceManifest
        $temporary=Join-Path ([IO.Path]::GetTempPath()) ('CinematicTV-'+[guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $temporary | Out-Null
        try {
            foreach ($file in $manifest.files) {
                $destination=Join-Path $temporary $file.path
                New-Item -ItemType Directory -Force -Path (Split-Path $destination -Parent) | Out-Null
                Copy-Item -LiteralPath (Join-Path (Join-Path $ProjectRoot 'src') $file.path) -Destination $destination
            }
            Invoke-Checked $tools.Tizen @('build-web','--',$temporary)
            $built=Join-Path $temporary '.buildResult'
            if (-not (Test-Path -LiteralPath $built -PathType Container)) { throw 'SDK did not create .buildResult.' }
            Invoke-Checked $tools.Tizen @('package','-t','wgt','-s',$CertificateProfile,'--',$built)
            $packages=@(Get-ChildItem -LiteralPath $temporary -Filter '*.wgt' -Recurse -File)
            if ($packages.Count -ne 1) { throw 'Expected exactly one newly signed WGT; inspect the SDK output.' }
            $info=Test-SignedPackage $packages[0].FullName
            New-Item -ItemType Directory -Force -Path $SignedDirectory | Out-Null
            if (Test-Path -LiteralPath $DefaultWgt) { Copy-Item -LiteralPath $DefaultWgt -Destination ($DefaultWgt+'.previous') -Force }
            Copy-Item -LiteralPath $packages[0].FullName -Destination $DefaultWgt -Force
            $info | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath ($DefaultWgt+'.checks.json')
            Write-Host "Signed package: $DefaultWgt"
            Write-Host "SHA-256: $($info.Sha256)"
            Write-Host "Author certificate SHA-256: $($info.AuthorCertificateSha256)"
            Write-Host 'Not installed yet. Use -Action Install with the TV IPv4 address after permitting installation in Device Manager.'
        } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Recurse -Force } }
        exit 0
    }
    if ($Action -eq 'Install') {
        if (-not $WgtPath) { $WgtPath=$DefaultWgt }
        $info=Test-SignedPackage $WgtPath
        $serial=Get-TvSerial
        $resolved=(Resolve-Path -LiteralPath $WgtPath).Path
        Invoke-Checked $tools.Tizen @('install','-s',$serial,'--name',(Split-Path $resolved -Leaf),'--',(Split-Path $resolved -Parent))
        Invoke-Checked $tools.Tizen @('run','-s',$serial,'-p',$AppId)
        Write-Host 'SDK install and run commands succeeded. Confirm picture, remote and native settings on the TV; this is not a hardware test report.'
        exit 0
    }
    if ($Action -eq 'Run') {
        $serial=Get-TvSerial
        Invoke-Checked $tools.Tizen @('run','-s',$serial,'-p',$AppId)
    }
} catch { Write-Error $_.Exception.Message; exit 1 }
