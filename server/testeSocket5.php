<?php
class Chat {
    protected $clients;

    public function __construct() {
        $this->clients = array();
    }

    public function onOpen($conn) {
        $this->clients[(int)$conn->resourceId] = $conn;
        echo "Nova conexão: ({$conn->resourceId})\n";
    }

    public function onMessage($from, $msg) {
        $numRecv = count($this->clients) - 1;
        echo sprintf('Conexão %d enviou mensagem "%s" para %d outras conexões' . "\n",
            $from->resourceId, $msg, $numRecv);
        foreach ($this->clients as $client) {
            if ($from !== $client) {
                $client->send(encodeMessage($msg));
            }
        }
    }

    public function onClose($conn) {
        unset($this->clients[(int)$conn->resourceId]);
        echo "Conexão ({$conn->resourceId}) fechada\n";
    }

    public function onError($conn, $e) {
        echo "Erro: {$e->getMessage()}\n";
        $conn->close();
    }
}

class Connection {
    public $resourceId;
    public $socket;

    public function __construct($socket) {
        $this->socket = $socket;
        $this->resourceId = (int)$socket;
    }

    public function send($msg) {
        fwrite($this->socket, $msg);
    }

    public function close() {
        fclose($this->socket);
    }
}

function perform_handshaking($received_header, $client_conn, $host, $port) {
    $headers = array();
    $lines = preg_split("/\r\n/", $received_header);
    foreach ($lines as $line) {
        $line = chop($line);
        if (preg_match('/\A(\S+): (.*)\z/', $line, $matches)) {
            $headers[$matches[1]] = $matches[2];
        }
    }

    $secKey = $headers['Sec-WebSocket-Key'];
    $secAccept = base64_encode(pack('H*', sha1($secKey . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')));

    $upgrade = "HTTP/1.1 101 Web Socket Protocol Handshake\r\n" .
               "Upgrade: websocket\r\n" .
               "Connection: Upgrade\r\n" .
               "WebSocket-Origin: $host\r\n" .
               "WebSocket-Location: ws://$host:$port\r\n" .
               "Sec-WebSocket-Accept:$secAccept\r\n\r\n";
    fwrite($client_conn, $upgrade);
}

function unmask($payload) {
    $length = ord($payload[1]) & 127;

    if ($length == 126) {
        $masks = substr($payload, 4, 4);
        $data = substr($payload, 8);
    } elseif ($length == 127) {
        $masks = substr($payload, 10, 4);
        $data = substr($payload, 14);
    } else {
        $masks = substr($payload, 2, 4);
        $data = substr($payload, 6);
    }

    $text = '';
    for ($i = 0; $i < strlen($data); ++$i) {
        $text .= $data[$i] ^ $masks[$i % 4];
    }
    return $text;
}

function encodeMessage($msg) {
    $b1 = 0x80 | (0x1 & 0x0f); // 0x1 text frame (FIN + opcode)
    $length = strlen($msg);

    if ($length <= 125) {
        $header = pack('CC', $b1, $length);
    } elseif ($length > 125 && $length < 65536) {
        $header = pack('CCn', $b1, 126, $length);
    } else {
        $header = pack('CCNN', $b1, 127, $length);
    }

    return $header . $msg;
}

$chat = new Chat();

$server = stream_socket_server("tcp://0.0.0.0:12346", $errno, $errstr);
if (!$server) {
    die("Erro: $errstr ($errno)\n");
}

echo "Em execução!\n";

$clients = array($server);

while (true) {
    $read = $clients;
    $write = null;
    $except = null;

    if (stream_select($read, $write, $except, 0, 10) > 0) {
        if (in_array($server, $read)) {
            $conn = stream_socket_accept($server);
            if ($conn) {
                $connection = new Connection($conn);
                $clients[] = $conn;

                // Perform WebSocket handshake
                $headers = fread($conn, 1024);
                perform_handshaking($headers, $conn, 'localhost', 12346);

                $chat->onOpen($connection);
            }
            unset($read[array_search($server, $read)]);
        }

        foreach ($read as $conn) {
            $msg = fread($conn, 1024);
            if ($msg === false || $msg === '') {
                $connection = new Connection($conn);
                $chat->onClose($connection);
                fclose($conn);
                unset($clients[array_search($conn, $clients)]);
            } else {
                $decoded_msg = unmask($msg);
                $connection = new Connection($conn);
                $chat->onMessage($connection, $decoded_msg);
            }
        }
    }
}

fclose($server);
?>