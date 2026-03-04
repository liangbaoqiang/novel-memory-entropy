#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 读取配置
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// 读取所有章节
const chaptersDir = path.join(__dirname, '../chapters');
const chapters = [];

for (let i = 1; i <= 20; i++) {
  const chapterPath = path.join(chaptersDir, `chapter-${String(i).padStart(3, '0')}.md`);
  if (fs.existsSync(chapterPath)) {
    const content = fs.readFileSync(chapterPath, 'utf-8');
    chapters.push({
      number: i,
      content: content
    });
  }
}

// 合并所有章节
let fullText = `# 《${config.title}》\n\n`;
fullText += `作者：${config.author}\n\n`;
fullText += `类型：${config.genre}\n\n`;
fullText += `主题：${config.theme}\n\n`;
fullText += `创作完成：${config.completedDate}\n\n`;
fullText += `总章节：${chapters.length} 章\n\n`;
fullText += `总字数：约 10 万字\n\n`;
fullText += `---\n\n`;

// 添加目录
fullText += `## 目录\n\n`;
chapters.forEach(chapter => {
  const firstLine = chapter.content.split('\n')[0] || `第${chapter.number}章`;
  fullText += `- [${firstLine}](#第${chapter.number}章)\n`;
});
fullText += `\n---\n\n`;

// 添加正文
chapters.forEach(chapter => {
  fullText += chapter.content;
  fullText += `\n\n---\n\n`;
});

// 保存 TXT 格式
const txtPath = path.join(__dirname, `${config.title}.txt`);
fs.writeFileSync(txtPath, fullText, 'utf-8');
console.log(`✅ TXT 导出成功：${txtPath}`);

// 生成简单的 EPUB
generateEPUB(config, chapters, __dirname);

console.log('\n🎉 导出完成！');

function generateEPUB(config, chapters, outputDir) {
  // EPUB 基本结构
  const mimetype = 'application/epub+zip';
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:12345678-1234-1234-1234-123456789012</dc:identifier>
    <dc:title>${config.title}</dc:title>
    <dc:creator>${config.author}</dc:creator>
    <dc:language>zh</dc:language>
    <meta property="dcterms:modified">2026-03-05</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${chapters.map((c, i) => `<item id="chapter${i}" href="chapters/chapter-${String(i+1).padStart(3, '0')}.xhtml" media-type="application/xhtml+xml"/>`).join('\n    ')}
  </manifest>
  <spine>
    <itemref idref="nav"/>
    ${chapters.map((c, i) => `<itemref idref="chapter${i}"/>`).join('\n    ')}
  </spine>
</package>`;

  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:12345678-1234-1234-1234-123456789012"/>
  </head>
  <docTitle><text>${config.title}</text></docTitle>
  <navMap>
    ${chapters.map((c, i) => `
    <navPoint id="navpoint${i+1}" playOrder="${i+1}">
      <navLabel><text>第${i+1}章</text></navLabel>
      <content src="chapters/chapter-${String(i+1).padStart(3, '0')}.xhtml"/>
    </navPoint>`).join('')}
  </navMap>
</ncx>`;

  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${config.title}</title>
</head>
<body>
  <h1>${config.title}</h1>
  <p>作者：${config.author}</p>
  <nav epub:type="toc">
    <ol>
      ${chapters.map((c, i) => `<li><a href="chapters/chapter-${String(i+1).padStart(3, '0')}.xhtml">第${i+1}章</a></li>`).join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;

  // 创建目录结构
  const epubDir = path.join(outputDir, 'temp_epub');
  const oebpsDir = path.join(epubDir, 'OEBPS');
  const chaptersDir = path.join(oebpsDir, 'chapters');

  fs.mkdirSync(chaptersDir, { recursive: true });

  // 写入文件
  fs.writeFileSync(path.join(epubDir, 'mimetype'), mimetype);
  fs.mkdirSync(path.join(epubDir, 'META-INF'));
  fs.writeFileSync(path.join(epubDir, 'META-INF', 'container.xml'), containerXml);
  fs.writeFileSync(path.join(oebpsDir, 'content.opf'), contentOpf);
  fs.writeFileSync(path.join(oebpsDir, 'toc.ncx'), tocNcx);
  fs.writeFileSync(path.join(oebpsDir, 'nav.xhtml'), navXhtml);

  // 转换章节为 XHTML
  chapters.forEach((chapter, i) => {
    const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>第${i+1}章</title>
  <style>
    body { font-family: "SimSun", serif; line-height: 1.6; padding: 20px; }
    h1 { text-align: center; color: #333; }
    p { text-indent: 2em; margin: 1em 0; }
  </style>
</head>
<body>
  <h1>第${i+1}章</h1>
  ${chapter.content.replace(/\n/g, '<br/>\n')}
</body>
</html>`;
    fs.writeFileSync(path.join(chaptersDir, `chapter-${String(i+1).padStart(3, '0')}.xhtml`), xhtml);
  });

  // 打包成 EPUB（需要 zip 命令）
  console.log('📦 正在打包 EPUB...');
  
  const { execSync } = require('child_process');
  try {
    execSync(`cd "${epubDir}" && zip -rX "${outputDir}/${config.title}.epub" mimetype META-INF OEBPS`, { stdio: 'pipe' });
    console.log(`✅ EPUB 导出成功：${path.join(outputDir, config.title + '.epub')}`);
  } catch (e) {
    console.log('⚠️  EPUB 打包失败（可能缺少 zip 命令），请手动打包');
  }

  // 清理临时目录
  try {
    execSync(`rm -rf "${epubDir}"`);
  } catch (e) {}
}
