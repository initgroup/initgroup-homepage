$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

try {
    chcp.com 65001 | Out-Null
} catch {
    # Console/Text encodings above are sufficient when chcp is unavailable.
}
