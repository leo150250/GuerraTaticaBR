<?php
require __DIR__ . '/vendor/autoload.php';

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

class Chat implements MessageComponentInterface {
	protected $clients;

	public function __construct() {
		$this->clients = new \SplObjectStorage;
	}

    public function onOpen(ConnectionInterface $conn) {
		$this->clients->attach($conn);
        echo "Nova conexão: ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
		$numRecv = count($this->clients) - 1;
		echo sprintf('Conexão %d enviou mensagem "%s" para %d outras conexões' . "\n",
			$from->resourceId, $msg, $numRecv);
        foreach ($this->clients as $client) {
			if ($from !== $client) {
				$client->send($msg);
			}
		}
    }

    public function onClose(ConnectionInterface $conn) {
		$this->clients->detach($conn);
        echo "Conexão ({$conn->resourceId}) fechada\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "Erro: {$e->getMessage()}\n";
        $conn->close();
    }
}

$server = IoServer::factory(
	new HttpServer(
		new WsServer(
			new Chat()
		)
	), 12346);
//$server->route('/chat', new Chat, ['*']);
echo "Em execução!\n";
$server->run();