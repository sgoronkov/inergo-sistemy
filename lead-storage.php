<?php
/**
 * Общее хранилище заявок для send-lead.php и leads-export.php.
 *
 * Заявки лежат в одном CSV рядом с папкой сайта, а не внутри public_html:
 * так файл нельзя скачать, просто угадав адрес.
 */

declare(strict_types=1);

const LEAD_COLUMNS = ['Дата', 'Имя', 'Телефон', 'Площадь', 'Задачи', 'Комментарий', 'Источник', 'Страница', 'IP'];
const LEAD_CSV_DELIMITER = ';';

/**
 * Каталог с данными: на шаг выше public_html, если туда можно писать.
 * На хостингах, где родительская папка закрыта, откатываемся на папку рядом
 * со скриптом — её закрывает правило в .htaccess.
 */
function lead_data_dir(): string
{
    $outside = dirname(__DIR__) . '/leads-data';
    if (is_dir($outside) || @mkdir($outside, 0700, true) || is_dir($outside)) {
        if (is_writable($outside)) {
            return $outside;
        }
    }

    $inside = __DIR__ . '/leads-data';
    if (!is_dir($inside)) {
        @mkdir($inside, 0700, true);
    }
    return $inside;
}

function lead_csv_path(): string
{
    return lead_data_dir() . '/leads.csv';
}

/**
 * Экранирует значения, которые Excel и LibreOffice принимают за формулы.
 */
function lead_csv_safe(string $value): string
{
    return $value !== '' && strpbrk($value[0], "=+-@\t\r") !== false ? "'" . $value : $value;
}

function lead_store(array $lead): bool
{
    $path = lead_csv_path();
    $isNew = !is_file($path) || filesize($path) === 0;

    $handle = @fopen($path, 'a');
    if ($handle === false) {
        return false;
    }

    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        return false;
    }

    if ($isNew) {
        // BOM нужен, чтобы Excel не превратил кириллицу в кракозябры.
        fwrite($handle, "\xEF\xBB\xBF");
        fputcsv($handle, LEAD_COLUMNS, LEAD_CSV_DELIMITER);
    }

    $row = [];
    foreach (LEAD_COLUMNS as $column) {
        $row[] = lead_csv_safe((string)($lead[$column] ?? ''));
    }
    $ok = fputcsv($handle, $row, LEAD_CSV_DELIMITER) !== false;

    flock($handle, LOCK_UN);
    fclose($handle);

    return $ok;
}
