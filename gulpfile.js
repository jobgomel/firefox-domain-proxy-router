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
    manifest: 'manifest.json',
    license: 'LICENSE*', // Поддержит и просто LICENSE, и LICENSE.txt, и LICENSE.md
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

function qaCopyMeta() {
    // Теперь копируем manifest.json, файлы LICENSE и папку icons вместе
    return gulp.src([paths.manifest, paths.license, paths.icons], { base: '.', allowEmpty: true })
        .pipe(gulp.dest('dist/qa'));
}

function qaZip() {
    return gulp.src('dist/qa/**/*')
        .pipe(zip('qa.zip'))
        .pipe(gulp.dest('dist'));
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

function prodCopyMeta() {
    // Копируем метаданные (включая LICENSE) для публикации
    return gulp.src([paths.manifest, paths.license, paths.icons], { base: '.', allowEmpty: true })
        .pipe(gulp.dest('dist/prod'));
}

function prodZip() {
    return gulp.src('dist/prod/**/*')
        .pipe(zip('prod.zip'))
        .pipe(gulp.dest('dist'));
}

// ==========================================
// СЦЕНАРИИ СБОРКИ
// ==========================================

const buildQa = gulp.series(
    gulp.parallel(qaHtml, qaCss, qaJs, qaCopyMeta),
    qaZip
);

const buildProd = gulp.series(
    gulp.parallel(prodHtml, prodCss, prodJs, prodCopyMeta),
    prodZip
);

const buildAll = gulp.series(
    clean,
    buildQa,
    buildProd
);

exports.qa = gulp.series(clean, buildQa);
exports.prod = gulp.series(clean, buildProd);
exports.default = buildAll;