// The key is assembled at runtime so this repository never contains a key-shaped literal;
// the rendered DOM does, which is what the scan has to catch.
document.body.dataset.assistantKey = ['sk', 'proj', 'FIXTUREnotArealKEY0123456789abcdef'].join('-');
