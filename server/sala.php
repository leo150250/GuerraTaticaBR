<?php
class Estado {
    public $id;
    public $nome;
    public $vida;
    public $corMatiz;
    public $corSaturacao;
    public $cor;
    public $acessoAgua;
    public $controlador;
    public $vizinhos;

    public function __construct($data) {
        $this->id = $data['id'];
        $this->nome = $data['nome'];
        $this->vida = 1;
        $this->corMatiz = $data['corMatiz'];
        $this->corSaturacao = $data['corSaturacao'];
        $this->cor = $this->hslToHex($this->corMatiz, $this->corSaturacao, 50);
        $this->acessoAgua = $data['acessoAgua'];
        $this->controlador = $data['controlador'];
        $this->vizinhos = $data['vizinhos'];
    }

    private function hslToHex($h, $s, $l) {
        $s /= 100;
        $l /= 100;
        $c = (1 - abs(2 * $l - 1)) * $s;
        $x = $c * (1 - abs(($h / 60) % 2 - 1));
        $m = $l - $c / 2;
        $r = 0;
        $g = 0;
        $b = 0;

        if (0 <= $h && $h < 60) {
            $r = $c; $g = $x; $b = 0;
        } else if (60 <= $h && $h < 120) {
            $r = $x; $g = $c; $b = 0;
        } else if (120 <= $h && $h < 180) {
            $r = 0; $g = $c; $b = $x;
        } else if (180 <= $h && $h < 240) {
            $r = 0; $g = $x; $b = $c;
        } else if (240 <= $h && $h < 300) {
            $r = $x; $g = 0; $b = $c;
        } else if (300 <= $h && $h < 360) {
            $r = $c; $g = 0; $b = $x;
        }

        $r = round(($r + $m) * 255);
        $g = round(($g + $m) * 255);
        $b = round(($b + $m) * 255);

        return sprintf("#%02x%02x%02x", $r, $g, $b);
    }

    public function toJson() {
        return json_encode([
            'id' => $this->id,
            'nome' => $this->nome,
            'vida' => $this->vida,
            'corMatiz' => $this->corMatiz,
            'corSaturacao' => $this->corSaturacao,
            'cor' => $this->cor,
            'acessoAgua' => $this->acessoAgua,
            'controlador' => $this->controlador->id,
            'vizinhos' => $this->vizinhos
        ]);
    }
}

class Jogador {
    public $id;
    public $nome;
    public $imagem;
    public $usuario;
    public $cpu;
    public $derrotado;
    public $corMatiz;
    public $corSaturacao;
    public $cor;

    public function __construct($data) {
        $this->id = $data['id'];
        $this->nome = $data['nome'];
        $this->imagem = $data['svgId'] . ".svg";
        $this->usuario = isset($data['usuario']) ? $data['usuario'] : null;
        $this->cpu = !isset($data['usuario']);
        $this->derrotado = false;
        $this->corMatiz = $data['corMatiz'];
        $this->corSaturacao = $data['corSaturacao'];
        $this->cor = $this->hslToHex($this->corMatiz, $this->corSaturacao, 50);
    }

    private function hslToHex($h, $s, $l) {
        $s /= 100;
        $l /= 100;
        $c = (1 - abs(2 * $l - 1)) * $s;
        $x = $c * (1 - abs(($h / 60) % 2 - 1));
        $m = $l - $c / 2;
        $r = 0;
        $g = 0;
        $b = 0;

        if (0 <= $h && $h < 60) {
            $r = $c; $g = $x; $b = 0;
        } else if (60 <= $h && $h < 120) {
            $r = $x; $g = $c; $b = 0;
        } else if (120 <= $h && $h < 180) {
            $r = 0; $g = $c; $b = $x;
        } else if (180 <= $h && $h < 240) {
            $r = 0; $g = $x; $b = $c;
        } else if (240 <= $h && $h < 300) {
            $r = $x; $g = 0; $b = $c;
        } else if (300 <= $h && $h < 360) {
            $r = $c; $g = 0; $b = $x;
        }

        $r = round(($r + $m) * 255);
        $g = round(($g + $m) * 255);
        $b = round(($b + $m) * 255);

        return sprintf("#%02x%02x%02x", $r, $g, $b);
    }
}

class Acao {
    public $origem;
    public $tipo;
    public $destino;
    public $agua;
    public $controlador;
    public $excluir;

    public function __construct($origem, $tipo, $destino = null, $agua = false) {
        $this->origem = $origem;
        $this->tipo = $tipo;
        $this->destino = $destino;
        $this->agua = $agua;
        $this->controlador = $origem->controlador;
        $this->excluir = false;
    }

    public function executar() {
        if (!$this->excluir) {
            // Implementar lógica de execução da ação
            $this->excluir = true;
            return true;
        } else {
            return false;
        }
    }

    public function invalidar() {
        $this->excluir = true;
    }
}

$estados = [];
$jogadores = [];
$acoes = [];
$dataTurno = new DateTime();
$numTurnos = 0;

$salaNome = uniqid();
$pid = getmypid();
$dataAbertura = date('Y-m-d H:i:s');
$salasFile = __DIR__ . '/sistema/.dados/salas.json';
$logFile = __DIR__ . "/sistema/.dados/{$salaNome}_log.txt";
function registrarNoLog($mensagem) {
    global $logFile;
    file_put_contents($logFile, date('Y-m-d H:i:s') . " - " . $mensagem . PHP_EOL, FILE_APPEND);
    echo $mensagem . "\n";
}

// Registra uma nova sala no arquivo salas.json
$salas = json_decode(file_get_contents($salasFile), true);
$salas[] = ['nome' => $salaNome, 'pid' => $pid, 'data_abertura' => $dataAbertura];
file_put_contents($salasFile, json_encode($salas, JSON_PRETTY_PRINT));
registrarNoLog("Sala {$salaNome} criada com PID {$pid}");

// Registra a função de encerramento
register_shutdown_function('encerraSala');

function inicializarEstadosEJogadores() {
    global $estados, $jogadores, $dataTurno, $numTurnos, $salaNome, $salasFile, $logFile;

    // Reseta tudo
    $estados = [];
    $jogadores = [];
    $dataTurno = new DateTime();
    $numTurnos = 0;

    // Inicializa a data da rodada para janeiro de daqui a dois anos
    $dataTurno->modify('+2 years');
    $dataTurno->setDate($dataTurno->format('Y'), 1, 1);
    $numTurnos = 0;

    $estrutura = [
        ["id" => "AC", "svgId" => "BR-AC", "nome" => "Acre", "corMatiz" => 144, "corSaturacao" => 50, "vizinhos" => ["RO", "AM"], "acessoAgua" => false],
        ["id" => "AL", "svgId" => "BR-AL", "nome" => "Alagoas", "corMatiz" => 176, "corSaturacao" => 50, "vizinhos" => ["SE", "BA", "PE"], "acessoAgua" => true],
        ["id" => "AM", "svgId" => "BR-AM", "nome" => "Amazonas", "corMatiz" => 208, "corSaturacao" => 50, "vizinhos" => ["AC", "RO", "RR", "MT", "PA"], "acessoAgua" => false],
        ["id" => "AP", "svgId" => "BR-AP", "nome" => "Amapá", "corMatiz" => 240, "corSaturacao" => 50, "vizinhos" => ["PA"], "acessoAgua" => true],
        ["id" => "BA", "svgId" => "BR-BA", "nome" => "Bahia", "corMatiz" => 272, "corSaturacao" => 50, "vizinhos" => ["ES", "MG", "GO", "TO", "PI", "PE", "AL", "SE"], "acessoAgua" => true],
        ["id" => "CE", "svgId" => "BR-CE", "nome" => "Ceará", "corMatiz" => 304, "corSaturacao" => 50, "vizinhos" => ["PI", "RN", "PB", "PE"], "acessoAgua" => true],
        ["id" => "DF", "svgId" => "BR-DF", "nome" => "Distrito Federal", "corMatiz" => 336, "corSaturacao" => 75, "vizinhos" => ["GO"], "acessoAgua" => false],
        ["id" => "ES", "svgId" => "BR-ES", "nome" => "Espírito Santo", "corMatiz" => 8, "corSaturacao" => 75, "vizinhos" => ["RJ", "MG", "BA"], "acessoAgua" => true],
        ["id" => "GO", "svgId" => "BR-GO", "nome" => "Goiás", "corMatiz" => 40, "corSaturacao" => 75, "vizinhos" => ["DF", "MG", "MS", "MT", "TO", "BA"], "acessoAgua" => false],
        ["id" => "MA", "svgId" => "BR-MA", "nome" => "Maranhão", "corMatiz" => 72, "corSaturacao" => 75, "vizinhos" => ["TO", "PA", "PI"], "acessoAgua" => true],
        ["id" => "MG", "svgId" => "BR-MG", "nome" => "Minas Gerais", "corMatiz" => 104, "corSaturacao" => 75, "vizinhos" => ["ES", "RJ", "SP", "MS", "GO", "BA"], "acessoAgua" => false],
        ["id" => "MS", "svgId" => "BR-MS", "nome" => "Mato Grosso do Sul", "corMatiz" => 136, "corSaturacao" => 75, "vizinhos" => ["PR", "MT", "GO", "MG", "SP"], "acessoAgua" => false],
        ["id" => "MT", "svgId" => "BR-MT", "nome" => "Mato Grosso", "corMatiz" => 168, "corSaturacao" => 75, "vizinhos" => ["MS", "GO", "TO", "PA", "AM", "RO"], "acessoAgua" => false],
        ["id" => "PA", "svgId" => "BR-PA", "nome" => "Pará", "corMatiz" => 200, "corSaturacao" => 75, "vizinhos" => ["AP", "RR", "AM", "MT", "TO", "MA"], "acessoAgua" => true],
        ["id" => "PB", "svgId" => "BR-PB", "nome" => "Paraíba", "corMatiz" => 232, "corSaturacao" => 75, "vizinhos" => ["CE", "RN", "PE"], "acessoAgua" => true],
        ["id" => "PE", "svgId" => "BR-PE", "nome" => "Pernambuco", "corMatiz" => 264, "corSaturacao" => 75, "vizinhos" => ["AL", "BA", "PI", "CE", "PB"], "acessoAgua" => true],
        ["id" => "PI", "svgId" => "BR-PI", "nome" => "Piauí", "corMatiz" => 296, "corSaturacao" => 75, "vizinhos" => ["MA", "CE", "PE", "BA", "TO"], "acessoAgua" => true],
        ["id" => "PR", "svgId" => "BR-PR", "nome" => "Paraná", "corMatiz" => 328, "corSaturacao" => 100, "vizinhos" => ["MS", "SP", "SC"], "acessoAgua" => true],
        ["id" => "RJ", "svgId" => "BR-RJ", "nome" => "Rio de Janeiro", "corMatiz" => 0, "corSaturacao" => 100, "vizinhos" => ["MG", "ES", "SP"], "acessoAgua" => true],
        ["id" => "RN", "svgId" => "BR-RN", "nome" => "Rio Grande do Norte", "corMatiz" => 32, "corSaturacao" => 100, "vizinhos" => ["CE", "PB"], "acessoAgua" => true],
        ["id" => "RO", "svgId" => "BR-RO", "nome" => "Rondônia", "corMatiz" => 64, "corSaturacao" => 100, "vizinhos" => ["AC", "AM", "MT"], "acessoAgua" => false],
        ["id" => "RR", "svgId" => "BR-RR", "nome" => "Roraima", "corMatiz" => 96, "corSaturacao" => 100, "vizinhos" => ["AM", "PA"], "acessoAgua" => false],
        ["id" => "RS", "svgId" => "BR-RS", "nome" => "Rio Grande do Sul", "corMatiz" => 128, "corSaturacao" => 100, "vizinhos" => ["SC"], "acessoAgua" => true],
        ["id" => "SC", "svgId" => "BR-SC", "nome" => "Santa Catarina", "corMatiz" => 160, "corSaturacao" => 100, "vizinhos" => ["PR", "RS"], "acessoAgua" => true],
        ["id" => "SE", "svgId" => "BR-SE", "nome" => "Sergipe", "corMatiz" => 192, "corSaturacao" => 100, "vizinhos" => ["BA", "AL"], "acessoAgua" => true],
        ["id" => "SP", "svgId" => "BR-SP", "nome" => "São Paulo", "corMatiz" => 224, "corSaturacao" => 100, "vizinhos" => ["PR", "MS", "MG", "RJ"], "acessoAgua" => true],
        ["id" => "TO", "svgId" => "BR-TO", "nome" => "Tocantins", "corMatiz" => 256, "corSaturacao" => 100, "vizinhos" => ["GO", "MT", "PA", "MA", "PI", "BA"], "acessoAgua" => false]
    ];

    foreach ($estrutura as $estadoData) {
        $jogador = new Jogador($estadoData);
        $jogadores[] = $jogador;
        $estadoData['controlador'] = $jogador;
        $estado = new Estado($estadoData);
        $estados[] = $estado;
    }

    registrarNoLog("Estados e jogadores inicializados");
}

function encerraSala() {
    global $salaNome, $salasFile;

    // Remove a entrada da sala no arquivo salas.json
    $salas = json_decode(file_get_contents($salasFile), true);
    $salas = array_filter($salas, function($sala) {
        global $salaNome;
        return $sala['nome'] !== $salaNome;
    });
    file_put_contents($salasFile, json_encode(array_values($salas), JSON_PRETTY_PRINT));

    registrarNoLog("Sala {$salaNome} encerrada");
}

function avancarDataRodada() {
    global $dataTurno, $numTurnos;
    $dataTurno->modify('+1 month');
    $numTurnos++;
    registrarNoLog("Data avançada para: " . $dataTurno->format('F Y'));
}

function obterStatusPartida() {
    global $dataTurno, $numTurnos, $estados;
    $hash = obterHashEstados();
    $status = [
        'data' => $dataTurno->format('F Y'),
        'numTurnos' => $numTurnos,
        'hash' => $hash
    ];
    return json_encode($status);
}

function atribuirConexaoAJogador($conn, $jogadorId) {
    global $jogadores;

    foreach ($jogadores as $jogador) {
        if ($jogador->id === $jogadorId) {
            $jogador->usuario = $conn;
            return $jogador;
        }
    }
    return null;
}

function criarAcao($origem, $tipo, $destino = null, $agua = false) {
    global $acoes;
    $acao = new Acao($origem, $tipo, $destino, $agua);
    $acoes[] = $acao;
    registrarNoLog("Ação criada: {$tipo} de {$origem->id}" . ($destino ? " para {$destino->id}" : ""));
}

function executarAcoes() {
    global $acoes;
    foreach ($acoes as $acao) {
        if ($acao->executar()) {
            registrarNoLog("Ação executada: {$acao->tipo} de {$acao->origem->id}" . ($acao->destino ? " para {$acao->destino->id}" : ""));
        }
    }
    $acoes = array_filter($acoes, function($acao) {
        return !$acao->excluir;
    });
}

// Inicializar estados e jogadores
inicializarEstadosEJogadores();

// Exemplo de criação e execução de ações
//criarAcao($estados[0], 'ATAQUE', $estados[1]);
//executarAcoes();

class Chat {
    protected $clients;

    public function __construct() {
        $this->clients = array();
    }

    public function onOpen($conn) {
        $this->clients[(int)$conn->resourceId] = $conn;
        registrarNoLog("Nova conexão: ({$conn->resourceId})");
    }

    public function onMessage($from, $msg) {
        if (strpos($msg, '\\') === 0) {
            // Interpretar como comando ao servidor
            $command = substr($msg, 1);
            registrarNoLog(sprintf("Comando recebido de %d: $command", $from->resourceId));
            switch ($command) {
                case 'stop':
                    registrarNoLog("Servidor parando...");
                    exit();
                    break;
                case 'reset':
                    registrarNoLog("Reiniciando estados e jogadores...");
                    inicializarEstadosEJogadores();
                    break;
                case 'check':
                    $status = obterStatusPartida();
                    $from->send(encodeMessage($status));
                    registrarNoLog($status);
                    break;
                case 'updateEstados':
                    $jsonEstados = obterJSONEstados();
                    $from->send(encodeMessage($jsonEstados));
                    registrarNoLog(encodeMessage($jsonEstados));
                    break;
                case 'nextTurn':
                    avancarDataRodada();
                    break;
                case 'ping':
                    $from->send(encodeMessage("pong"));
                    break;
                default:
                    registrarNoLog("Comando desconhecido: $command");
                    break;
            }
        } else {
            // Interpretar como mensagem de chat
            $numRecv = count($this->clients) - 1;
            registrarNoLog(sprintf('Conexão %d enviou mensagem "%s" para %d outras conexões',
                $from->resourceId, $msg, $numRecv));
            foreach ($this->clients as $client) {
                if ($from !== $client) {
                    $client->send(encodeMessage($msg));
                }
            }
        }
    }

    public function onClose($conn) {
        unset($this->clients[(int)$conn->resourceId]);
        registrarNoLog("Conexão ({$conn->resourceId}) fechada");
    }

    public function onError($conn, $e) {
        registrarNoLog("Erro: {$e->getMessage()}");
        $conn->close();
    }
}

function obterHashEstados() {
    $hash = md5(obterJSONEstados());
    return $hash;
}

function obterJSONEstados() {
    global $estados;
    $estadoData = array_map(function($estado) {
        return json_decode($estado->toJson(), true);
    }, $estados);
    return json_encode($estadoData);
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
    registrarNoLog("Erro ao abrir o servidor: $errstr ($errno)");
    die();
}

registrarNoLog("Servidor em execução!");

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