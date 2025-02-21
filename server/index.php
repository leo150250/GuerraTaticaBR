<?php
echo "<pre>";
$pathServidor = $_SERVER['DOCUMENT_ROOT'] . "/gtbrserver/";
// Verifica se a variável GET "novo" está definida
if (isset($_GET['novo'])) {
    $salasFile = $pathServidor . "/sistema/.dados/salas.json";
    
    $pid = getmypid();
    $salaNome = uniqid();
    
    $logFile = $pathServidor . "/sistema/.dados/{$salaNome}_log.txt";
    $overrideFile = $pathServidor . "/sistema/.dados/{$salaNome}_override.json";
    $dataAbertura = date('Y-m-d H:i:s'); // Captura a data e hora atuais

    // Função para registrar uma string no log da sala
    function registrarNoLog($mensagem) {
        global $logFile;
        file_put_contents($logFile, date('Y-m-d H:i:s') . " - " . $mensagem . PHP_EOL, FILE_APPEND);
    }

    // Cria um arquivo JSON limpo para o override
    file_put_contents($overrideFile, json_encode(new stdClass(), JSON_PRETTY_PRINT));

    // Registra a criação da sala no log
    registrarNoLog("Sala criada: {$salaNome}");

    // Registra uma nova sala no arquivo salas.json
    $salas = json_decode(file_get_contents($salasFile), true);
    $salas[] = ['nome' => $salaNome, 'pid' => $pid, 'data_abertura' => $dataAbertura];
    file_put_contents($salasFile, json_encode($salas, JSON_PRETTY_PRINT));

    // Função de encerramento para desregistrar a sala
    function encerraSala() {
        global $overrideFile, $salasFile, $salaNome, $emExecucao;
        if ($emExecucao) {
            registrarNoLog("Tempo limite encerrado. Até mais!");
        }
        
        $salas = json_decode(file_get_contents($salasFile), true);
        $salas = array_filter($salas, function($sala) use ($salaNome) {
            return $sala['nome'] !== $salaNome;
        });
        file_put_contents($salasFile, json_encode(array_values($salas), JSON_PRETTY_PRINT));

        unlink($overrideFile); // Remove o arquivo de override

        // Registra o encerramento da sala no log
        registrarNoLog("Sala encerrada: {$salaNome}");
    }
    register_shutdown_function('encerraSala');

	// Ajusta o timeout de execução de scripts para rodar infinitamente
	set_time_limit(600);

    $emExecucao = true;
    while ($emExecucao) {
        if (file_exists($overrideFile)) {
            $overrideData = json_decode(file_get_contents($overrideFile), true);
            if (is_array($overrideData)) {
                foreach ($overrideData as $comando) {
                    registrarNoLog("Comando recebido: " . $comando);
                    // Verifica se o comando é "stop"
                    switch ($comando) {
                        case 'stop':
                            registrarNoLog("Encerrando a sala...");
                            $emExecucao = false;
                            exit; // Encerra o loop e o script
                    }
                }
            }
            // Limpa o arquivo override
            file_put_contents($overrideFile, json_encode(new stdClass(), JSON_PRETTY_PRINT));
        }
        registrarNoLog("Ping");
        sleep(10);
    }
}
?>