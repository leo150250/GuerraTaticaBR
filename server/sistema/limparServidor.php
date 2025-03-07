<?php
$pathServidor = $_SERVER['DOCUMENT_ROOT'] . "/gtbrserver/";
$salasFile = $pathServidor . "sistema/.dados/salas.json";
$salas = json_decode(file_get_contents($salasFile), true);
$currentPid = getmypid();

// Função para enviar o comando "stop" para uma sala
function enviarComandoStop($salaNome) {
    global $pathServidor;
    $overrideFile = $pathServidor . "sistema/.dados/{$salaNome}_override.json";
    $comando = ['comando' => 'stop'];
    file_put_contents($overrideFile, json_encode($comando, JSON_PRETTY_PRINT));
}

// Envia o comando "stop" para todas as salas
foreach ($salas as $sala) {
    enviarComandoStop($sala['nome']);
}

// Aguarda até 6 segundos para que os processos se encerrem normalmente
sleep(6);

// Re-read the salas file to check for any changes
$salas = json_decode(file_get_contents($salasFile), true);

foreach ($salas as $index => $sala) {
    $pid = $sala['pid'];

    if ($pid != $currentPid) {
        if (PHP_OS_FAMILY === 'Windows') {
            $command = "tasklist /FO CSV | findstr /I \"\\\"{$pid}\\\"\"";
            exec($command, $output, $result);

            if (!empty($output)) {
                $command = "taskkill /F /PID {$pid}";
                exec($command, $output, $result);
                if ($result == 0) {
                    echo "Sala {$sala['nome']} encerrada com sucesso.\n";
                } else {
                    echo "Falha ao encerrar a sala {$sala['nome']} (" . $result . ") - " . implode("\n", $output) . "\n";
                }
            }
        } else {
            if (posix_kill($pid, SIGTERM)) {
                echo "Sala {$sala['nome']} encerrada com sucesso.\n";
            } else {
                echo "Falha ao encerrar a sala {$sala['nome']}.\n";
            }
        }

        // Remove log and override files
        @unlink($pathServidor . "sistema/.dados/{$sala['nome']}_log.txt");
        @unlink($pathServidor . "sistema/.dados/{$sala['nome']}_override.json");

        // Remove the sala from the list
        unset($salas[$index]);
    }
}

// Save the updated salas list
file_put_contents($salasFile, json_encode(array_values($salas), JSON_PRETTY_PRINT));

if (count($salas) == 1 && $salas[0]['pid'] == $currentPid) {
    $sala = $salas[0];
    @unlink($pathServidor . "sistema/.dados/{$sala['nome']}_log.txt");
    @unlink($pathServidor . "sistema/.dados/{$sala['nome']}_override.json");

    // Save the updated salas list
    file_put_contents($salasFile, json_encode([], JSON_PRETTY_PRINT));

    if (PHP_OS_FAMILY === 'Windows') {
        $command = "taskkill /F /PID {$currentPid}";
        exec($command);
    } else {
        posix_kill($currentPid, SIGTERM);
    }
}
?>