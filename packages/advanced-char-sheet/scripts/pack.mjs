import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

const output = fs.createWriteStream(path.join(process.cwd(), 'dist/advanced-char-sheet.pam'));
const archive = archiver('zip', {
    zlib: { level: 9 }
});

output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive.on('error', function(err) {
    throw err;
});

archive.pipe(output);

// Add files
archive.file('dist/index.js', { name: 'index.js' });
if (fs.existsSync('dist/index.css')) {
    archive.file('dist/index.css', { name: 'index.css' });
}
archive.file('mod.toml', { name: 'mod.toml' });

archive.finalize();
