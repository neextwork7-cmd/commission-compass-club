<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/bootstrap.php';
function check(bool $ok, string $label): void { if (!$ok) throw new RuntimeException($label); echo "PASS: $label\n"; }
check(\LifeOS\Cron::baseUrl('https://example.com/backendserver/') === 'https://example.com/backendserver', 'HTTPS backend base normalized');
foreach (['http://example.com', 'https://user:pass@example.com', 'https://example.com?key=x', 'https://example.com#x', "https://example.com\n"] as $url) {
    try { \LifeOS\Cron::baseUrl($url); $blocked=false; } catch (\LifeOS\HttpError $error) { $blocked=$error->status===422; }
    check($blocked, 'Unsafe scheduler base rejected');
}
if (!getenv('LIFEOS_CRON_TEST')) exit;
function callCron(string $mode, bool $signed=true, mixed $batch=100): array {
    $path='/api/public/cron/settle';$body=json_encode(['mode'=>$mode,'batch'=>$batch]);$ts=(string)time();
    $headers=['Content-Type: application/json'];
    if ($signed) { $headers[]='X-Master-Ts: '.$ts;$headers[]='X-Master-Sig: '.hash_hmac('sha256',"$ts.POST.$path.".hash('sha256',$body),'test-master-key-0123456789abcdef0123456789abcdef'); }
    $c=curl_init('http://127.0.0.1:8090'.$path);curl_setopt_array($c,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$body,CURLOPT_HTTPHEADER=>$headers,CURLOPT_RETURNTRANSFER=>true]);
    $raw=curl_exec($c);$status=(int)curl_getinfo($c,CURLINFO_HTTP_CODE);curl_close($c);return [$status,json_decode((string)$raw,true)];
}
check(callCron('dry-run',false)[0]===401,'Unsigned cron request rejected');
$r=callCron('dry-run');check($r[0]===200&&($r[1]['data']['status']??'')==='dry-run','Signed dry-run succeeds');
check(callCron('execute')[0]===403,'Cron URL cannot bypass server approval');
check(callCron('dry-run',true,'100')[0]===422,'Non-integer batch rejected');
check(callCron('invalid')[0]===422,'Invalid cron mode rejected');