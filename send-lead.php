<?php
/**
 * Приём заявок с сайта «Технология тепла».
 *
 * Принимает JSON, проверяет данные, сохраняет заявку в CSV-архив и шлёт письма.
 * Отвечает {"ok":true} или {"ok":false,"error":"..."} — фронтенд ждёт именно этот формат.
 *
 * Архив пишется раньше писем: почта может отказать, а заявка теряться не должна.
 * Выгрузить архив можно через leads-export.php.
 */

declare(strict_types=1);

const LEAD_RECIPIENTS = ['sgoronkov@yandex.ru', 'avdeevrodion@yandex.ru'];
const LEAD_SUBJECT = 'Заявка с сайта «Технология тепла»';

// Домен для адреса отправителя: почтовые серверы отвергают письма
// с чужого адреса в From, поэтому подставляем свой хост.
const LEAD_FROM = 'no-reply@inergo-sistemy.ru';

const RATE_LIMIT_SECONDS = 20;

require __DIR__ . '/lead-storage.php';

header('Content-Type: application/json; charset=utf-8');

function fail(string $message, int $status = 400)
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('Метод не поддерживается', 405);
}

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: '', true);
if (!is_array($data)) {
    fail('Некорректный запрос');
}

// Скрытое поле website видно только ботам: если оно заполнено, тихо «принимаем» заявку.
if (trim((string)($data['website'] ?? '')) !== '') {
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

$name = trim((string)($data['name'] ?? ''));
$phone = preg_replace('/\D/', '', (string)($data['phone'] ?? ''));

if ($name === '' || mb_strlen($name) > 100) {
    fail('Укажите имя');
}
if (!preg_match('/^7\d{10}$/', (string)$phone)) {
    fail('Укажите телефон в формате +7XXXXXXXXXX');
}

// Простейшая защита от флуда: одна заявка с адреса раз в RATE_LIMIT_SECONDS.
$stamp = sys_get_temp_dir() . '/lead-' . md5((string)($_SERVER['REMOTE_ADDR'] ?? '')) . '.txt';
if (is_file($stamp) && (time() - (int)filemtime($stamp)) < RATE_LIMIT_SECONDS) {
    fail('Заявка уже отправлена, подождите немного', 429);
}
@touch($stamp);

$lead = [
    'Дата' => date('Y-m-d H:i:s'),
    'Имя' => $name,
    'Телефон' => '+' . $phone,
    'Площадь' => trim((string)($data['area'] ?? '')),
    'Задачи' => trim((string)($data['scope'] ?? '')),
    'Комментарий' => trim((string)($data['comment'] ?? '')),
    'Источник' => trim((string)($data['source'] ?? 'Сайт')),
    'Страница' => trim((string)($_SERVER['HTTP_REFERER'] ?? '')),
    'IP' => (string)($_SERVER['REMOTE_ADDR'] ?? ''),
];

$stored = lead_store($lead);

$lines = [];
foreach ($lead as $label => $value) {
    if ($value !== '' && $label !== 'IP') {
        $lines[] = $label . ': ' . $value;
    }
}
if (!$stored) {
    $lines[] = '';
    $lines[] = 'Внимание: заявку не удалось записать в архив на сервере.';
}

$body = implode("\n", $lines);
$headers = implode("\r\n", [
    'From: Сайт «Технология тепла» <' . LEAD_FROM . '>',
    'Reply-To: ' . LEAD_FROM,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
]);

$subject = '=?UTF-8?B?' . base64_encode(LEAD_SUBJECT) . '?=';

$sent = 0;
foreach (LEAD_RECIPIENTS as $recipient) {
    if (mail($recipient, $subject, $body, $headers)) {
        $sent++;
    }
}

// Заявка потеряна, только если не сработало вообще ничего. Если письмо ушло
// хотя бы на один адрес или осталась запись в архиве — для посетителя всё хорошо.
if ($sent === 0 && !$stored) {
    fail('Не удалось отправить заявку', 500);
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
