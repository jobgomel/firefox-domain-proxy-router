const gulp = require('gulp');
const cleanCSS = require('gulp-clean-css');
const terser = require('gulp-terser');
const htmlmin = require('gulp-htmlmin');
const stripComments = require('gulp-strip-comments');
const zip = require('gulp-zip').default;
const del = require('del').deleteAsync;

// Пути к исходным файлам
const paths = {
    html: 'src/**/*.html',
    css: 'src/**/*.css',
    js: 'src/**/*.js',
    locales: '_locales/**/*.json',
    manifest: 'manifest.json',
    license: 'LICENSE*', 
    icons: 'icons/**/*'
};

// 1. Очистка папки dist перед сборкой
function clean() {
    return del(['dist']);
}

// ==========================================
// ЭТАП 1: СБОРКА ДЛЯ ТЕСТЕРОВ (Без комментариев)
// ==========================================

function qaHtml() {
    return gulp.src(paths.html)
        .pipe(stripComments({ html: true }))
        .pipe(gulp.dest('dist/qa/src'));
}

function qaCss() {
    return gulp.src(paths.css)
        .pipe(cleanCSS({ format: 'beautify', level: 0 }))
        .pipe(gulp.dest('dist/qa/src'));
}

function qaJs() {
    return gulp.src(paths.js)
        .pipe(stripComments())
        .pipe(gulp.dest('dist/qa/src'));
}

function qaLocales() {
    return gulp.src(paths.locales)
        .pipe(gulp.dest('dist/qa/_locales'));
}

function qaCopyMeta() {
    // ДОБАВЛЕНО { encoding: false }, так как здесь копируются бинарные иконки (paths.icons)
    return gulp.src([paths.manifest, paths.license, paths.icons], { base: '.', allowEmpty: true, encoding: false })
        .pipe(gulp.dest('dist/qa'));
}

// ==========================================
// ЭТАП 2: СБОРКА ДЛЯ ПУБЛИКАЦИИ (Минификация)
// ==========================================

function prodHtml() {
    return gulp.src(paths.html)
        .pipe(htmlmin({ collapseWhitespace: true, removeComments: true }))
        .pipe(gulp.dest('dist/prod/src'));
}

function prodCss() {
    return gulp.src(paths.css)
        .pipe(cleanCSS({ level: 2 }))
        .pipe(gulp.dest('dist/prod/src'));
}

function prodJs() {
    return gulp.src(paths.js)
        .pipe(terser({ compress: true, mangle: true }))
        .pipe(gulp.dest('dist/prod/src'));
}

function prodLocales() {
    return gulp.src(paths.locales)
        .pipe(gulp.dest('dist/prod/_locales'));
}

function prodCopyMeta() {
    // ДОБАВЛЕНО { encoding: false } из-за картинок из папки icons
    return gulp.src([paths.manifest, paths.license, paths.icons], { base: '.', allowEmpty: true, encoding: false })
        .pipe(gulp.dest('dist/prod'));
}

function prodZip() {
    // ДОБАВЛЕНО { encoding: false }, так как архивация читает уже собранные PNG файлы из dist/prod
    return gulp.src('dist/prod/**/*', { encoding: false })
        .pipe(zip('prod.zip'))
        .pipe(gulp.dest('dist'));
}

function qaZip() {
    return gulp.src('dist/qa/**/*', { encoding: false })
        .pipe(zip('qa.zip'))
        .pipe(gulp.dest('dist'));
}

// ==========================================
// СЦЕНАРИИ СБОРКИ
// ==========================================

const buildQa = gulp.series(
    gulp.parallel(qaHtml, qaCss, qaJs, qaLocales, qaCopyMeta),
    qaZip
);

const buildProd = gulp.series(
    gulp.parallel(prodHtml, prodCss, prodJs, prodLocales, prodCopyMeta),
    prodZip
);

// Экспортируем основные задачи
exports.clean = clean;
exports.build = gulp.series(clean, gulp.parallel(buildQa, buildProd));
exports.default = exports.build;