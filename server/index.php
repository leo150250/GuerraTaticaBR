<?php
require __DIR__ . '/vendor/autoload.php';

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

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
    file_put_contents($overrideFile, json_encode([], JSON_PRETTY_PRINT));

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
    set_time_limit(10);

    // Configura o servidor WebSocket
    class Sala implements MessageComponentInterface {
        public function onOpen(ConnectionInterface $conn) {
            registrarNoLog("Nova conexão: ({$conn->resourceId})");
        }

        public function onMessage(ConnectionInterface $from, $msg) {
            registrarNoLog("Comando recebido via WebSocket: " . $msg);

            // Verifica se o comando é "stop"
            if ($msg === 'stop') {
                registrarNoLog("Encerrando a sala...");
                global $emExecucao;
                $emExecucao = false;
                global $server;
                $server->loop->stop();
                $from->close();
            } else {
                $from->send("Comando recebido: " . $msg);
            }
        }

        public function onClose(ConnectionInterface $conn) {
            registrarNoLog("Conexão ({$conn->resourceId}) fechada");
        }

        public function onError(ConnectionInterface $conn, \Exception $e) {
            registrarNoLog("Erro: {$e->getMessage()}");
            $conn->close();
        }
    }

    $server = IoServer::factory(
        new HttpServer(
            new WsServer(
                new Sala()
            )
        ),
        12346
    );

    registrarNoLog("Servidor WebSocket aberto em ws://127.0.0.1:12346");

    $emExecucao = true;
    $server->run();

    // Verifica o arquivo override para comandos
    while ($emExecucao) {
        if (file_exists($overrideFile)) {
            $overrideContent = json_decode(file_get_contents($overrideFile), true);
            if (!empty($overrideContent)) {
                $comando = array_shift($overrideContent);
                registrarNoLog("Comando recebido via override: " . $comando);

                // Verifica se o comando é "stop"
                if ($comando === 'stop') {
                    registrarNoLog("Encerrando a sala...");
                    $emExecucao = false;
                    $server->loop->stop();
                    break;
                }

                // Atualiza o arquivo override após processar o comando
                file_put_contents($overrideFile, json_encode($overrideContent, JSON_PRETTY_PRINT));
            }
        }
        sleep(1);
    }

    registrarNoLog("Servidor WebSocket fechado");
}
?>