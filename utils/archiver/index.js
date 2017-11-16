'use strict';

const archiver = require('archiver');
const Promise = require('bluebird');
const path = require('path');
const fs = require('fs');

/**
 * Class representing files archiving
 */
class Archiver {
  constructor(sqz) {
    this.sqz = sqz;
  }

  packageFunctions(functions, props) {
    const vars = props.vars;

    return new Promise((resolve) => {
      Promise.each(functions, (functionObj) => {
        const srcPath = path.join(vars.path, '.build', 'cloud', 'functions', functionObj.identifier);
        const destPath = path.join(functionObj.packagePath, functionObj.packageFile);
        return this.zipDir(srcPath, destPath);
      }).then(() => {
        resolve();
      });
    });
  }

  /**
   * Zips a directory
   *
   * @param {string} source - source directory path "/tmp/my-files"
   * @param {string} dest - destionation path "/tmp/myfiles.zip"
   *
   * @name this.sqz.archive
   */
  zipDir(source, dest) {
    return new Promise((resolve, reject) => {
      const archive = archiver.create('zip', {});

      const output = fs.createWriteStream(dest);

      archive.on('error', (err) => {
        reject(err);
      });


      output.on('close', () => {
        resolve();
      });

      archive.pipe(output);

      archive.directory(source, './');

      archive.finalize();
    });
  }
}

module.exports = Archiver;
