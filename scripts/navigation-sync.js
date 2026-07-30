const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const NAV = `
<nav class="main-navigation">
  <a href="../">Home</a>
  <a href="../all-tools/">All Tools</a>
  <a href="../Blog/">Blog</a>
  <a href="../about/">About</a>
  <a href="../contact/">Contact</a>
  <a href="../privacy-policy/">Privacy Policy</a>
  <a href="../terms/">Terms</a>
  <a href="../disclaimer/">Disclaimer</a>
</nav>
`;

function getFiles(dir){
  let files=[];

  for(const item of fs.readdirSync(dir)){
    if(item==="node_modules") continue;
    if(item===".git") continue;
    if(item===".github") continue;

    const full=path.join(dir,item);

    if(fs.statSync(full).isDirectory()){
      files=files.concat(getFiles(full));
    }else if(item==="index.html"){
      files.push(full);
    }
  }

  return files;
}

const pages=getFiles(ROOT);

pages.forEach(file=>{

  let html=fs.readFileSync(file,"utf8");

  html=html.replace(
    /<nav[\s\S]*?<\/nav>/i,
    NAV
  );

  fs.writeFileSync(file,html);

  console.log("Updated:",file);

});

console.log("Navigation synchronized successfully.");
