const Generator = require('yeoman-generator');
const {CaseMap} = require('./case-map');
/**
 * API component generator for Yo.
 *
 */
module.exports = class extends Generator {
  /**
   * @constreuctor
   *
   * @param {Array} args
   * @param {?Object} opts
   */
  constructor(args, opts) {
    super(args, opts);
    this.caseMap = new CaseMap();
    this.questions = [];
  }
  /**
   * Gathering information about current project.
   */
  initializing() {
    this.questions[this.questions.length] = {
      type: 'input',
      name: 'name',
      message: 'Component name',
      default: this.appname.replace(/\s/g, '-'),
      validate: this._validateComponentName.bind(this)
    };
    this.questions[this.questions.length] = {
      type: 'input',
      name: 'desc',
      message: 'Description',
      default: ''
    };
    this.questions[this.questions.length] = {
      type: 'confirm',
      name: 'preview',
      message: 'Make it 2.0.0-preview?',
      default: false
    };
    this._detectOldMetaFiles();
    const files = this._getDeleteList();
    if (files.length) {
      this.projectIsOld = true;
      this.questions[this.questions.length] = {
        type: 'confirm',
        name: 'deleteOld',
        message: `Delete old files: ${files.join(', ')}?`,
        default: true
      };
    } else {
      this.projectIsOld = false;
    }
  }
  /**
   * Detects if old and unused in current structure files exists.
   */
  _detectOldMetaFiles() {
    this.hasEditorconfig = this.fs.exists(
      this.destinationPath('.editorconfig'));
    this.hasGitattributes = this.fs.exists(this.destinationPath(
      '.gitattributes'));
    this.hasJsbeautifyrc = this.fs.exists(
      this.destinationPath('.jsbeautifyrc'));
    this.hasJscsrcc = this.fs.exists(this.destinationPath('.jscsrc'));
    this.hasJshintrc = this.fs.exists(this.destinationPath('.jshintrc'));
    this.hasNpmignore = this.fs.exists(this.destinationPath('.npmignore'));
    this.hasDependencyci = this.fs.exists(
      this.destinationPath('dependencyci.yml'));
  }
  /**
   * Creates a list of files to be deleted.
   *
   * @return {Array<String>}
   */
  _getDeleteList() {
    const files = [];
    if (this.hasEditorconfig) {
      files[files.length] = '.editorconfig';
    }
    if (this.hasGitattributes) {
      files[files.length] = '.gitattributes';
    }
    if (this.hasJsbeautifyrc) {
      files[files.length] = '.jsbeautifyrc';
    }
    if (this.hasJscsrcc) {
      files[files.length] = '.jscsrc';
    }
    if (this.hasJshintrc) {
      files[files.length] = '.jshintrc';
    }
    if (this.hasNpmignore) {
      files[files.length] = '.npmignore';
    }
    if (this.hasDependencyci) {
      files[files.length] = 'dependencyci.yml';
    }
    return files;
  }
  /**
   * Prompt user for options.
   *
   * @return {Promise}
   */
  prompting() {
    return this.prompt(this.questions)
    .then((answers) => {
      this.templateOptions = {
        moduleName: answers.name,
        moduleDesc: answers.desc,
        moduleVersion: answers.preview ? '2.0.0-preview' : '0.1.0',
        moduleClassName: this.caseMap.dashToCamelCase(answers.name)
      };
      this.deleteOld = answers.deleteOld;
      this.is2preview = answers.preview;
    });
  }
  /**
   * Validates component name.
   *
   * @param {String} input User input
   * @return {Boolean}
   */
  _validateComponentName(input) {
    if (!input) {
      this.log('Name is required');
      return false;
    }
    const valid = input.indexOf('-') !== -1;
    if (!valid) {
      this.log('The name must contain "-" character');
    }
    return valid;
  }
  /**
   * Write template files.
   */
  writing() {
    let files = [
      'gen-tsd.json',
      'polymer.json',
      'index.html',
      'CONTRIBUTING.md',
      '.gitignore',
      'tasks/ci.js',
      'wct.conf.json',
      'README.md'
    ];
    if (!this.projectIsOld) {
      files = files.concat([
        'package.json',
        'bower.json',
        'test/index.html',
        'demo/index.html',
        '.travis.yml'
      ]);
    }
    files.forEach((file) => {
      this.fs.copyTpl(
        this.templatePath(file),
        this.destinationPath(file),
        this.templateOptions
      );
    });
    this.fs.copyTpl(
      this.templatePath('component.html'),
      this.destinationPath(`${this.templateOptions.moduleName}.html`),
      this.templateOptions
    );
    this.fs.copyTpl(
      this.templatePath('test/component-test.html'),
      this.destinationPath(`test/${this.templateOptions.moduleName}test.html`),
      this.templateOptions
    );
    if (this.deleteOld) {
      this._deleteOld();
    }
    if (this.projectIsOld) {
      this._upgradePackage();
      this._upgradeBower();
      this._upgradeTravis();
      if (this.fs.exists(this.destinationPath('bower_components'))) {
        // Upgrading bower from Polymer v1 to v2 will cause conflicts.
        // I don't like that.
        this.fs.delete(this.destinationPath('bower_components'));
      }
    }
  }
  /**
   * Deletes old files.
   */
  _deleteOld() {
    if (this.hasEditorconfig) {
      this.fs.delete(this.destinationPath('.editorconfig'));
    }
    if (this.hasGitattributes) {
      this.fs.delete(this.destinationPath('.gitattributes'));
    }
    if (this.hasJsbeautifyrc) {
      this.fs.delete(this.destinationPath('.jsbeautifyrc'));
    }
    if (this.hasJscsrcc) {
      this.fs.delete(this.destinationPath('.jscsrc'));
    }
    if (this.hasJshintrc) {
      this.fs.delete(this.destinationPath('.jshintrc'));
    }
    if (this.hasNpmignore) {
      this.fs.delete(this.destinationPath('.npmignore'));
    }
    if (this.hasDependencyci) {
      this.fs.delete(this.destinationPath('dependencyci.yml'));
    }
  }
  /**
   * Installs bower and NPM packages.
   */
  install() {
    this.installDependencies({
      bower: !this.projectIsOld,
      npm: true
    });
  }
  /**
   * Upgrades package.json to new structure.
   */
  _upgradePackage() {
    const file = this.destinationPath('package.json');
    if (!this.fs.exists(file)) {
      return;
    }
    const content = this.fs.readJSON(file);
    const types = '@polymer/gen-typescript-declarations';
    if (!content.devDependencies[types]) {
      content.devDependencies[types] = '^1.1.1';
    }
    const bower = 'bower';
    if (!content.devDependencies[bower]) {
      content.devDependencies[bower] = '^1.8.0';
    }
    [
      'conventional-github-releaser',
      'gulp-conventional-changelog',
      'gulp',
      'gulp-bump',
      'gulp-git',
      'gulp-html-extract',
      'gulp-if',
      'gulp-jshint',
      'gulp-jscs',
      'gulp-jscs-stylish',
      'gulp-load-plugins',
      'gulp-util',
      'jshint-stylish',
      'run-sequence',
      'polymer-cli',
      'web-component-tester'
    ].forEach((item) => {
      if (content.devDependencies && content.devDependencies[item]) {
        delete content.devDependencies[item];
      }
      if (content.dependencies && content.dependencies[item]) {
        delete content.dependencies[item];
      }
    });
    if (content.engine) {
      delete content.engine;
    }
    if (content.author) {
      delete content.author;
      content.authors = [
        'Pawel Psztyc',
        'The Advanced REST client authors <arc@mulesoft.com>'
      ];
    }
    content.license = 'Apache-2.0';
    if (!content.scripts) {
      content.scripts = {};
    }
    const name = this.templateOptions.moduleName;
    content.scripts.lint = `polymer lint ${name}.html`;
    content.scripts.test = `polymer test --plugin local`;
    let sauce = 'polymer test --plugin sauce';
    sauce += ` --job-name "${name}:local-test"`;
    content.scripts['test-sauce'] = sauce;
    content.scripts['update-types'] = 'gen-typescript-declarations ';
    content.scripts['update-types'] += '--deleteExisting --outDir .';
    delete content.scripts.release;
    delete content.scripts.serve;
    delete content.scripts.deps;
    if (content.main instanceof Array) {
      content.main = content.main[0];
    }
    if (this.is2preview) {
      content.version = '2.0.0-preview';
    }
    this.fs.writeJSON(file, content, null, 2);
  }
  /**
   * Upgrades values in old bower file.
   */
  _upgradeBower() {
    const file = this.destinationPath('bower.json');
    if (!this.fs.exists(file)) {
      return;
    }
    const content = this.fs.readJSON(file);
    content.license = 'Apache-2.0';
    if (content.main instanceof Array) {
      content.main = content.main[0];
    }
    if (!content.devDependencies) {
      content.devDependencies = {};
    }
    const pe = 'PolymerElements/';
    content.devDependencies['iron-demo-helpers'] =
      pe + 'iron-demo-helpers#^2.0.0';
    content.devDependencies['web-component-tester'] =
      'Polymer/web-component-tester#^6.0.0';
    content.devDependencies.webcomponentsjs =
      'webcomponents/webcomponentsjs#^1.0.0';
    content.devDependencies['iron-component-page'] =
      pe + 'iron-component-page#^3.0.1';
    content.devDependencies['iron-test-helpers'] =
      pe + 'iron-test-helpers#^2.0.0';
    delete content.devDependencies['paper-styles'];
    delete content.devDependencies['test-fixture'];
    if (content.ignore && content.ignore instanceof Array) {
      const index = content.ignore.indexOf('dependencyci.yml');
      if (index !== -1) {
        content.ignore.splice(index, 1);
      }
    }
    if (this.is2preview) {
      content.version = '2.0.0-preview';
    }
    this.fs.writeJSON(file, content, null, 2);
  }
  /**
   * Upgrades travis config file.
   * It reads `keys` information and replaces the file with new template,
   */
  _upgradeTravis() {
    const file = this.destinationPath('.travis.yml');
    if (!this.fs.exists(file)) {
      return;
    }
    const yaml = require('js-yaml');
    let env;
    try {
      const doc = yaml.safeLoad(this.fs.read(file));
      env = doc.env;
    } catch (e) {
      return;
    }
    let testcmd = 'if [ "${TRAVIS_PULL_REQUEST}" = "false" ]; then';
    testcmd += ' polymer test --plugin sauce --job-name "';
    testcmd += this.templateOptions.moduleName + ':${TRAVIS_BRANCH}" ';
    testcmd += '--build-number=${TRAVIS_BUILD_NUMBER}; fi';
    const content = {
      language: 'node_js',
      node_js: 'stable',
      sudo: 'required',
      before_script: [
        'npm install -g polymer-cli',
        'polymer install --variants'
      ],
      addons: {
        firefox: 'latest',
        apt: {
          sources: ['google-chrome'],
          packages: ['google-chrome-stable']
        },
        sauce_connect: true
      },
      script: [
        'npm run lint',
        'xvfb-run polymer test polymer test --plugin local',
        testcmd
      ],
      cache: {
        directories: ['node_modules']
      },
      after_success: ['node tasks/ci.js']
    };
    if (env) {
      content.env = env;
    }
    this.fs.write(file, yaml.dump(content));
  }
};