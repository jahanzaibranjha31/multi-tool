const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const redirects = {
  "/tools": "/all-tools/",
  "/tool": "/all-tools/",
  "/blogs": "/Blog/",
  "/blogs": "/Blog/",
  "/privacy": "/privacy-policy/",
  "/terms-and-conditions": "/terms/",
  "/contact-us": "/contact/",
  "/about-us": "/about/"
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="refresh" content="0; url=TARGET">
<link rel="canonical" href="TARGET">
<title>Redirecting...</title>
<script>
location.replace("TARGET");
</script>
</head>
<body>
<p>Redirecting...</p>
</body>
</html>`;

for (const [from,to] of Object.entries(redirects)){

    const folder = path.join(ROOT, from.replace(/^\/+/,""));

    fs.mkdirSync(folder,{recursive:true});

    fs.writeFileSync(
        path.join(folder,"index.html"),
        html.replaceAll("TARGET",to)
    );

    console.log(`${from} -> ${to}`);
}

console.log("Redirect pages generated.");
