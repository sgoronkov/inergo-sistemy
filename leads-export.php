<?php
/**
 * Выгрузка архива заявок в CSV.
 *
 *   /leads-export.php?key=КЛЮЧ              — все заявки
 *   /leads-export.php?key=КЛЮЧ&month=2026-08 — только за месяц
 *
 * Ключ лежит в файле lead-export.key рядом с папкой заявок и намеренно не хранится
 * в репозитории: исходники сайта открыты, а ключ открывать нельзя.
 */

declare(strict_types=1);

require __DIR__ . '/lead-storage.php';

function export_fail(string $message, int $status)
{
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    echo $message;
    exit;
}

$keyFile = lead_data_dir() . '/lead-export.key';
$expected = is_file($keyFile) ? trim((string)file_get_contents($keyFile)) : '';
$given = trim((string)($_GET['key'] ?? ''));

if ($expected === '') {
    export_fail('Выгрузка не настроена: на сервере нет файла с ключом.', 503);
}
if ($given === '' || !hash_equals($expected, $given)) {
    export_fail('Доступ запрещён.', 403);
}

$path = lead_csv_path();
if (!is_file($path)) {
    export_fail('Заявок пока нет.', 404);
}

$month = (string)($_GET['month'] ?? '');
if ($month !== '' && !preg_match('/^\d{4}-\d{2}$/', $month)) {
    export_fail('Месяц указывается как 2026-08.', 400);
}

$handle = fopen($path, 'r');
if ($handle === false) {
    export_fail('Не удалось прочитать архив.', 500);
}

$filename = 'zayavki-' . ($month !== '' ? $month : 'vse') . '.csv';
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');

$out = fopen('php://output', 'w');
fwrite($out, "\xEF\xBB\xBF");
fputcsv($out, LEAD_COLUMNS, LEAD_CSV_DELIMITER);

$first = true;
while (($row = fgetcsv($handle, 0, LEAD_CSV_DELIMITER)) !== false) {
    if ($first) {
        // Первая строка файла — заголовок вместе с BOM, свой мы уже вывели.
        $first = false;
        continue;
    }
    if ($row === [null] || $row === []) {
        continue;
    }
    // Дата лежит первой колонкой в формате Y-m-d H:i:s, поэтому месяц — это её начало.
    if ($month !== '' && strpos((string)($row[0] ?? ''), $month) !== 0) {
        continue;
    }
    fputcsv($out, $row, LEAD_CSV_DELIMITER);
}

fclose($handle);
