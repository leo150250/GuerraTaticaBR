<?php
#region Classes e Enums
class TipoAcao {
    const ATAQUE = 'ATAQUE';
    const DEFESA = 'DEFESA';
    const REFORCO = 'REFORCO';

    public static function toString($tipo) {
        switch ($tipo) {
            case self::ATAQUE:
                return 'atq';
            case self::DEFESA:
                return 'def';
            case self::REFORCO:
                return 'ref';
        }
    }
}
class EstadoPartida {
    const LOBBY = 'LOBBY';
    const PLANEJAMENTO = 'PLANEJAMENTO';
    const EXECUCAO = 'EXECUCAO';
    const AGUARDANDO = 'AGUARDANDO';
}

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
        return json_encode(array(
            'id' => $this->id,
            //'nome' => $this->nome,
            'vida' => $this->vida,
            //'corMatiz' => $this->corMatiz,
            //'corSaturacao' => $this->corSaturacao,
            //'cor' => $this->cor,
            //'acessoAgua' => $this->acessoAgua,
            'controlador' => $this->controlador->id,
            //'vizinhos' => $this->vizinhos
        ));
    }
}
class Jogador {
    public $id;
    public $idNome;
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
        $this->idNome = $data['nome'];
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

    public function __construct($origem, TipoAcao $tipo, $destino = null, $agua = false) {
        $this->origem = $origem;
        $this->tipo = $tipo;
        $this->destino = $destino;
        $this->agua = $agua;
        $this->controlador = $origem->controlador;
        $this->excluir = false;
    }

    public function executar() {
        if (!$this->excluir) {
            switch ($this->tipo) {
                case TipoAcao::REFORCO:
                    $this->origem->vida += 1;
                    registrarNoLog("Reforço ao território de " . $this->origem->nome . ", agora com " . $this->origem->vida . " vidas.");
                    break;
                case TipoAcao::ATAQUE:
                    if ($this->destino->vida > 0) {
                        $muroExistente = array_filter($GLOBALS['muros'], 'filtrarMuros');
                        if ($muroExistente) {
                            $muroExistente[0]->destruirMuro();
                            registrarNoLog("Ataque do território de " . $this->origem->nome . " ao território de " . $this->destino->nome . ", impedido pelo muro, que foi destruído.");
                        } else {
                            $this->destino->vida -= 1;
                            registrarNoLog("Ataque " . ($this->agua ? "marítimo " : "") . "do território de " . $this->origem->nome . " ao território de " . $this->destino->nome . " sob controle de " . $this->destino->controlador->nome . ".");
                        }
                    }
                    if ($this->destino->vida == 0) {
                        $this->destino->vida = 1;
                        $this->destino->controlador = $this->origem->controlador;
                        registrarNoLog("O território de " . $this->destino->nome . " foi conquistado por " . $this->origem->controlador->nome . ".");
                        
                        // Use a função de filtro
                        global $acaoDestino;
                        $acaoDestino = $this->destino;
                        $GLOBALS['acoes'] = array_filter($GLOBALS['acoes'], 'filtrarAcoes');
                    }
                    break;
                case TipoAcao::DEFESA:
                    global $origem, $destino;
                    $origem = $this->origem;
                    $destino = $this->destino;
                    if (!array_filter($GLOBALS['muros'], 'filtrarMuros')) {
                        $GLOBALS['muros'][] = new Muro($this->origem, $this->destino);
                        registrarNoLog("O território de " . $this->origem->nome . " criou um muro na fronteira com " . $this->destino->nome);
                    }
                    break;
            }
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
class Muro {
    public $estado1;
    public $estado2;

    public function __construct($estado1, $estado2) {
        $this->estado1 = $estado1;
        $this->estado2 = $estado2;
    }

    public function destruirMuro() {
        global $muros;
        $muros = array_filter($muros, 'filtrarMuros');
        registrarNoLog("Muro entre {$this->estado1->nome} e {$this->estado2->nome} foi destruído.");
    }
}
//Conexões e sockets
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
class Chat {
    protected $clients;

    public function __construct() {
        $this->clients = array();
    }

    public function onOpen($conn) {
        $this->clients[(int)$conn->resourceId] = $conn;
        registrarNoLog("Nova conexão: ({$conn->resourceId})");
        global $tempoPlanejamento;
        $conn->send(encodeMessage(json_encode(array(
            'tipo' => 'infoServer',
            'conteudo' => array(
                'resourceId' => $conn->resourceId,
                'timerPlan' => $tempoPlanejamento
            )
        ))));
        global $jogadores, $estadoPartida;
        if ($estadoPartida === EstadoPartida::LOBBY) {
            $jogadoresSemConexao = array_filter($jogadores, 'filtrarJogadoresSemConexao');
            if (!empty($jogadoresSemConexao)) {
                $jogadorAleatorio = $jogadoresSemConexao[array_rand($jogadoresSemConexao)];
                atribuirConexaoAJogador($conn, $jogadorAleatorio->id);
            }
            $status = json_encode(array(
                'tipo' => 'status',
                'conteudo' => json_decode(obterStatusPartida())
            ));
            foreach ($this->clients as $client) {
                $client->send(encodeMessage($status));
                $client->send(encodeMessage(json_encode(array(
                            "tipo"=>"msg",
                            "conteudo"=>array(
                                "remetente"=>-1,
                                "msg"=>"{$jogadorAleatorio->nome} entrou na sala")))));
            }
        }
    }

    public function onMessage($from, $msg) {
        if (strpos($msg, '\\') === 0) {
            // Interpretar como comando ao servidor
            $parts = explode(' ', substr($msg, 1));
            $command = $parts[0];
            $args = array_slice($parts, 1);
            registrarNoLog(sprintf("Comando recebido de %d: $command com argumentos: %s", $from->resourceId, implode(' ', $args)));
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
                    $from->send(encodeMessage(json_encode(array(
                        'tipo' => 'update',
                        'conteudo' => $jsonEstados))
                    ));
                    registrarNoLog("Jogador {$from->resourceId} solicitou atualização dos estados");
                    break;
                case 'nextTurn':
                    avancarDataRodada();
                    break;
                case 'ping':
                    $from->send(encodeMessage("pong"));
                    break;
                case 'linkPlayer':
                    $jogadorId = $args[0];
                    atribuirConexaoAJogador($from, $jogadorId);
                    $status = json_encode(array(
                        'tipo' => 'status',
                        'conteudo' => json_decode(obterStatusPartida())
                    ));
                    foreach ($this->clients as $client) {
                        $client->send(encodeMessage($status));
                    }
                    break;
                case 'renamePlayer':
                    $novoNome = implode(' ', $args);
                    obterJogadorDeConexao($from)->nome = $novoNome;
                    registrarNoLog("Jogador {$from->resourceId} renomeado para {$novoNome}");
                    $status = json_encode(array(
                        'tipo' => 'status',
                        'conteudo' => json_decode(obterStatusPartida())
                    ));
                    foreach ($this->clients as $client) {
                        $client->send(encodeMessage($status));
                    }
                    break;
                case 'action':
                    global $estados;
                    $origemId = $args[0];
                    switch($args[1]) {
                        case 'ATQ':
                            $tipo = TipoAcao::ATAQUE;
                            break;
                        case 'DEF':
                            $tipo = TipoAcao::DEFESA;
                            break;
                        case 'REF':
                            $tipo = TipoAcao::REFORCO;
                            break;
                        default:
                            $from->send(encodeMessage("Tipo de ação desconhecido"));
                            return;
                    }
                    $destinoId = isset($args[2]) ? $args[2] : null;
                    $agua = isset($args[3]) ? $args[3] : false;
                    $origem = null;
                    $destino = null;
                    foreach ($estados as $estado) {
                        if ($estado->id === $origemId) {
                            $origem = $estado;
                        }
                        if ($estado->id === $destinoId) {
                            $destino = $estado;
                        }
                    }
                    if ($origem) {
                        $novaAcao = new TipoAcao($tipo);
                        criarAcao($origem, $novaAcao, $destino, $agua);
                        registrarNoLog("Ação criada: {$novaAcao->toString($tipo)} de {$origem->id}" . ($destino ? " para {$destino->id}" : ""));
                    } else {
                        registrarNoLog("Falha ao criar ação: origem não encontrada");
                        die();
                    }
                    break;
                case 'ready':
                    global $numJogadoresProntos;
                    global $jogadores;
                    $numJogadoresProntos++;
                    registrarNoLog("Jogador " . obterJogadorDeConexao($from)->id . " pronto");
                    $humanPlayers = array_filter($jogadores, 'filtrarJogadoresHumanos');
                    $readyMessage = json_encode(array(
                        'tipo' => 'ready',
                        'conteudo' => $from->resourceId
                    ));
                    foreach ($this->clients as $client) {
                        $client->send(encodeMessage($readyMessage));
                    }
                    $remainingPlayers = count($humanPlayers) - $numJogadoresProntos;
                    registrarNoLog("Aguardando mais {$remainingPlayers} jogadores");
                    break;
                case 'notReady':
                    global $numJogadoresProntos;
                    global $jogadores;
                    $numJogadoresProntos--;
                    registrarNoLog("Jogador " . obterJogadorDeConexao($from)->id . " não está mais pronto");
                    $humanPlayers = array_filter($jogadores, 'filtrarJogadoresHumanos');
                    $readyMessage = json_encode(array(
                        'tipo' => 'notReady',
                        'conteudo' => $from->resourceId
                    ));
                    foreach ($this->clients as $client) {
                        $client->send(encodeMessage($readyMessage));
                    }
                    $remainingPlayers = count($humanPlayers) - $numJogadoresProntos;
                    registrarNoLog("Aguardando mais {$remainingPlayers} jogadores");
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
                    $client->send(encodeMessage(json_encode(array(
                        "tipo"=>"msg",
                        "conteudo"=>array(
                            "remetente"=>$from->resourceId,
                            "msg"=>$msg)))));
                }
            }
        }
    }

    public function onClose($conn) {
        $jogador = obterJogadorDeConexao($conn);
        if ($jogador) {
            $jogador->usuario = null;
            $jogador->cpu = true;
            registrarNoLog("Conexão ({$conn->resourceId}) desvinculada do jogador {$jogador->id}");
        }
        unset($this->clients[(int)$conn->resourceId]);
        registrarNoLog("Conexão ({$conn->resourceId}) fechada");
    }

    public function onError($conn, $e) {
        registrarNoLog("Erro: {$e->getMessage()}");
        $conn->close();
    }

    public function obterClientes() {
        return $this->clients;
    }
}
#endregion





#region Variáveis e definições-base
$muros = array();
$estados = array();
$jogadores = array();
$acoes = array();
$dataTurno = new DateTime();
$numTurnos = 0;

$salaNome = uniqid();
$pid = getmypid();
$dataAbertura = date('Y-m-d H:i:s');
$salasFile = __DIR__ . '/sistema/.dados/salas.json';
$logFile = __DIR__ . "/sistema/.dados/{$salaNome}_log.txt";

$estadoPartida = EstadoPartida::LOBBY;
$tempoPlanejamento = 30; // segundos
$inicioPlanejamento = null;
$chat = new Chat();
$server = stream_socket_server("tcp://0.0.0.0:12346", $errno, $errstr);
if (!$server) {
    registrarNoLog("Erro ao abrir o servidor: $errstr ($errno)");
    die();
}
$clients = array($server);
$timerIniciarPartidaLobby = 5;
$numJogadoresProntos = 0;

register_shutdown_function('encerraSala');
#endregion




#region Funções de servidor
// Defina a função de filtro para salas
function filtrarSalas($sala) {
    global $salaNome;
    return $sala['nome'] !== $salaNome;
}
function registrarNoLog($mensagem) {
    global $logFile;
    file_put_contents($logFile, date('Y-m-d H:i:s') . " - " . $mensagem . PHP_EOL, FILE_APPEND);
    echo $mensagem . "\n";
}
function encerraSala() {
    global $salaNome, $salasFile;

    // Remove a entrada da sala no arquivo salas.json
    $salas = json_decode(file_get_contents($salasFile), true);
    $salas = array_filter($salas, 'filtrarSalas');
    file_put_contents($salasFile, json_encode(array_values($salas), JSON_PRETTY_PRINT));

    registrarNoLog("Sala {$salaNome} encerrada");
}
function obterStatusPartida() {
    global $dataTurno, $numTurnos, $jogadores;
    $hash = obterHashEstados();
    $jogadoresData = array();
    foreach ($jogadores as $jogador) {
        if ($jogador->usuario!==null) {
            $jogadoresData[] = array(
                'id' => $jogador->id,
                'jogador' => $jogador->usuario->resourceId,
                'nome' => $jogador->nome,
                'imagem' => $jogador->imagem,
            );
        }
    }
    $status = array(
        'data' => $dataTurno->format('Y-m'),
        'numTurnos' => $numTurnos,
        'hash' => $hash,
        'jogadores' => $jogadoresData
    );
    return json_encode($status);
}
function atribuirConexaoAJogador($conn, $jogadorId) {
    global $jogadores;

    // Desfaz a conexão anterior, se houver
    $jogadorAnterior = obterJogadorDeConexao($conn);
    $nomeAnterior = null;
    if ($jogadorAnterior) {
        $jogadorAnterior->usuario = null;
        $jogadorAnterior->cpu = true;
        $nomeAnterior = $jogadorAnterior->nome;
        $jogadorAnterior->nome = gerarNomeAleatorio();
        registrarNoLog("Conexão ({$conn->resourceId}) desvinculada do jogador {$jogadorAnterior->id}");
    }

    foreach ($jogadores as $jogador) {
        if ($jogador->id === $jogadorId) {
            $jogador->usuario = $conn;
            $jogador->cpu = false;
            if ($nomeAnterior !== null) {
                $jogador->nome = $nomeAnterior;
            }
            registrarNoLog("Conexão ({$conn->resourceId}) vinculada ao jogador {$jogador->id}");
            return $jogador;
        }
    }
    return null;
}
function obterJogadorDeConexao($conn) {
    global $jogadores;

    foreach ($jogadores as $jogador) {
        if ($jogador->usuario != null) {
            if ($jogador->usuario->resourceId === $conn->resourceId) {
                return $jogador;
            }
        }
    }
    return null;
}
function iniciarPlanejamento() {
    global $estadoPartida, $inicioPlanejamento, $chat, $dataTurno, $numJogadoresProntos;
    $estadoPartida = EstadoPartida::PLANEJAMENTO;
    $inicioPlanejamento = time();
    foreach ($chat->obterClientes() as $client) {
        if ($client instanceof Connection) {
            $client->send(encodeMessage(json_encode(array(
                "tipo" => "plan",
                "conteudo" => array(
                    'data' => $dataTurno->format('Y-m'),
                    'hash' => obterHashEstados(),
                )
            ))));
        }
    }
    $numJogadoresProntos = 0;
    registrarNoLog("Rodada de planejamento iniciada");
}
function obterTempoRestantePlanejamento() {
    global $inicioPlanejamento, $tempoPlanejamento;
    if ($inicioPlanejamento === null) {
        return $tempoPlanejamento;
    }
    $tempoPassado = time() - $inicioPlanejamento;
    return max(0, $tempoPlanejamento - $tempoPassado);
}
function iniciarExecucao() {
    global $acoes, $estadoPartida, $numJogadoresProntos, $chat;
    $estadoPartida = EstadoPartida::EXECUCAO;
    registrarNoLog("Rodada de execução iniciada");
    shuffle($acoes);
    $jsonAcoes = obterJSONAcoes();
    foreach ($chat->obterClientes() as $client) {
        if ($client instanceof Connection) {
            $client->send(encodeMessage(json_encode(array(
                'tipo' => 'acoes',
                'conteudo' => json_decode($jsonAcoes)
            ))));
        }
    }

    $status = json_encode(array(
        'tipo' => 'status',
        'conteudo' => json_decode(obterStatusPartida())
    ));
    foreach ($chat->obterClientes() as $client) {
        if ($client instanceof Connection) {
            $client->send(encodeMessage($status));
        }
    }
    executarAcoes();
    $estadoPartida = EstadoPartida::AGUARDANDO;
    registrarNoLog("Estado da partida definido para AGUARDANDO");
    $numJogadoresProntos = 0;
}
function verificarEstadoPartida() {
    global $estadoPartida, $numJogadoresProntos, $jogadores, $timerIniciarPartidaLobby, $clients, $chat;
    if ($estadoPartida === EstadoPartida::PLANEJAMENTO) {
        $tempoRestante = obterTempoRestantePlanejamento();
        if ($tempoRestante <= 5 && $tempoRestante > 0) {
            registrarNoLog("Tempo restante para planejamento: {$tempoRestante} segundos");
        }
        if ($tempoRestante <= 0) {
            iniciarExecucao();
        }
        $humanPlayers = array_filter($jogadores, 'filtrarJogadoresHumanos');
        $remainingPlayers = count($humanPlayers) - $numJogadoresProntos;
        if ($remainingPlayers === 0) {
            registrarNoLog("Todos os jogadores prontos");
            iniciarExecucao();
        }
    } elseif ($estadoPartida === EstadoPartida::LOBBY) {
        $humanPlayers = array_filter($jogadores, 'filtrarJogadoresHumanos');
        if (count($humanPlayers) >= 2) {
            $remainingPlayers = count($humanPlayers) - $numJogadoresProntos;
            if ($remainingPlayers === 0) {
                if ($timerIniciarPartidaLobby > 0) {
                    registrarNoLog("Iniciando partida em {$timerIniciarPartidaLobby}...");
                    foreach ($chat->obterClientes() as $client) {
                        if ($client instanceof Connection) {
                            $client->send(encodeMessage(json_encode(array(
                                "tipo" => "msg",
                                "conteudo" => array(
                                    "remetente" => -1,
                                    "msg" => "A partida vai começar em {$timerIniciarPartidaLobby} segundos"
                                )
                            ))));
                        }
                    }
                    $timerIniciarPartidaLobby--;
                } else {
                    $timerIniciarPartidaLobby = 5;
                    iniciarPlanejamento();
                }
            } else {
                registrarNoLog("Aguardando mais jogadores...");
                $timerIniciarPartidaLobby = 5;
            }
        } else {
            registrarNoLog("Aguardando mais jogadores...");
        }
    }
    if ($estadoPartida === EstadoPartida::AGUARDANDO) {
        $humanPlayers = array_filter($jogadores, 'filtrarJogadoresHumanos');
        if (count($humanPlayers) >= 2) {
            $remainingPlayers = count($humanPlayers) - $numJogadoresProntos;
            echo "Aguardando jogadores: " . $remainingPlayers . "\n";
            if ($remainingPlayers === 0) {
                avancarDataRodada();
                iniciarPlanejamento();
            }
        } else {
            registrarNoLog("Não há jogadores humanos suficientes pra continuar!");
            die();
        }
    }
}
function obterHashEstados() {
    $hash = md5(obterJSONEstados());
    return $hash;
}
function obterJSONEstados() {
    global $estados;
    $estadoData = array();
    foreach ($estados as $estado) {
        $estadoData[] = json_decode($estado->toJson(), true);
    }
    return json_encode($estadoData);
}
function obterJSONAcoes() {
    global $acoes;
    $acaoData = array();
    foreach ($acoes as $acao) {
        $acaoData[] = array(
            'origem' => $acao->origem->id,
            'tipo' => TipoAcao::toString($acao->tipo),
            'destino' => $acao->destino ? $acao->destino->id : null,
            'agua' => $acao->agua
        );
    }
    return json_encode($acaoData);
}
function filtrarMuros($muro) {
    global $origem, $destino;
    return ($muro->estado1 === $origem && $muro->estado2 === $destino) || 
           ($muro->estado1 === $destino && $muro->estado2 === $origem);
}
//Funções de handshaking. Coisa avançada, não sei explicar o que acontece aqui
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
#endregion




#region Funções jogo
function inicializarEstadosEJogadores() {
    global $estados, $jogadores, $dataTurno, $numTurnos, $salaNome, $salasFile, $logFile;

    // Reseta tudo
    $estados = array();
    $jogadores = array();
    $dataTurno = new DateTime();
    $numTurnos = 0;

    // Inicializa a data da rodada para janeiro de daqui a dois anos
    $dataTurno->modify('+2 years');
    $dataTurno->setDate($dataTurno->format('Y'), 1, 1);
    $numTurnos = 0;

    $estrutura = array(
		array("id" => "AC", "svgId" => "BR-AC", "nome" => "Acre", "corMatiz" => 144, "corSaturacao" => 50, "vizinhos" => array("RO", "AM"), "acessoAgua" => false),
		array("id" => "AL", "svgId" => "BR-AL", "nome" => "Alagoas", "corMatiz" => 176, "corSaturacao" => 50, "vizinhos" => array("SE", "BA", "PE"), "acessoAgua" => true),
		array("id" => "AM", "svgId" => "BR-AM", "nome" => "Amazonas", "corMatiz" => 208, "corSaturacao" => 50, "vizinhos" => array("AC", "RO", "RR", "MT", "PA"), "acessoAgua" => false),
		array("id" => "AP", "svgId" => "BR-AP", "nome" => "Amapá", "corMatiz" => 240, "corSaturacao" => 50, "vizinhos" => array("PA"), "acessoAgua" => true),
		array("id" => "BA", "svgId" => "BR-BA", "nome" => "Bahia", "corMatiz" => 272, "corSaturacao" => 50, "vizinhos" => array("ES", "MG", "GO", "TO", "PI", "PE", "AL", "SE"), "acessoAgua" => true),
		array("id" => "CE", "svgId" => "BR-CE", "nome" => "Ceará", "corMatiz" => 304, "corSaturacao" => 50, "vizinhos" => array("PI", "RN", "PB", "PE"), "acessoAgua" => true),
		array("id" => "DF", "svgId" => "BR-DF", "nome" => "Distrito Federal", "corMatiz" => 336, "corSaturacao" => 75, "vizinhos" => array("GO"), "acessoAgua" => false),
		array("id" => "ES", "svgId" => "BR-ES", "nome" => "Espírito Santo", "corMatiz" => 8, "corSaturacao" => 75, "vizinhos" => array("RJ", "MG", "BA"), "acessoAgua" => true),
		array("id" => "GO", "svgId" => "BR-GO", "nome" => "Goiás", "corMatiz" => 40, "corSaturacao" => 75, "vizinhos" => array("DF", "MG", "MS", "MT", "TO", "BA"), "acessoAgua" => false),
		array("id" => "MA", "svgId" => "BR-MA", "nome" => "Maranhão", "corMatiz" => 72, "corSaturacao" => 75, "vizinhos" => array("TO", "PA", "PI"), "acessoAgua" => true),
		array("id" => "MG", "svgId" => "BR-MG", "nome" => "Minas Gerais", "corMatiz" => 104, "corSaturacao" => 75, "vizinhos" => array("ES", "RJ", "SP", "MS", "GO", "BA"), "acessoAgua" => false),
		array("id" => "MS", "svgId" => "BR-MS", "nome" => "Mato Grosso do Sul", "corMatiz" => 136, "corSaturacao" => 75, "vizinhos" => array("PR", "MT", "GO", "MG", "SP"), "acessoAgua" => false),
		array("id" => "MT", "svgId" => "BR-MT", "nome" => "Mato Grosso", "corMatiz" => 168, "corSaturacao" => 75, "vizinhos" => array("MS", "GO", "TO", "PA", "AM", "RO"), "acessoAgua" => false),
		array("id" => "PA", "svgId" => "BR-PA", "nome" => "Pará", "corMatiz" => 200, "corSaturacao" => 75, "vizinhos" => array("AP", "RR", "AM", "MT", "TO", "MA"), "acessoAgua" => true),
		array("id" => "PB", "svgId" => "BR-PB", "nome" => "Paraíba", "corMatiz" => 232, "corSaturacao" => 75, "vizinhos" => array("CE", "RN", "PE"), "acessoAgua" => true),
		array("id" => "PE", "svgId" => "BR-PE", "nome" => "Pernambuco", "corMatiz" => 264, "corSaturacao" => 75, "vizinhos" => array("AL", "BA", "PI", "CE", "PB"), "acessoAgua" => true),
		array("id" => "PI", "svgId" => "BR-PI", "nome" => "Piauí", "corMatiz" => 296, "corSaturacao" => 75, "vizinhos" => array("MA", "CE", "PE", "BA", "TO"), "acessoAgua" => true),
		array("id" => "PR", "svgId" => "BR-PR", "nome" => "Paraná", "corMatiz" => 328, "corSaturacao" => 100, "vizinhos" => array("MS", "SP", "SC"), "acessoAgua" => true),
		array("id" => "RJ", "svgId" => "BR-RJ", "nome" => "Rio de Janeiro", "corMatiz" => 0, "corSaturacao" => 100, "vizinhos" => array("MG", "ES", "SP"), "acessoAgua" => true),
		array("id" => "RN", "svgId" => "BR-RN", "nome" => "Rio Grande do Norte", "corMatiz" => 32, "corSaturacao" => 100, "vizinhos" => array("CE", "PB"), "acessoAgua" => true),
		array("id" => "RO", "svgId" => "BR-RO", "nome" => "Rondônia", "corMatiz" => 64, "corSaturacao" => 100, "vizinhos" => array("AC", "AM", "MT"), "acessoAgua" => false),
		array("id" => "RR", "svgId" => "BR-RR", "nome" => "Roraima", "corMatiz" => 96, "corSaturacao" => 100, "vizinhos" => array("AM", "PA"), "acessoAgua" => false),
		array("id" => "RS", "svgId" => "BR-RS", "nome" => "Rio Grande do Sul", "corMatiz" => 128, "corSaturacao" => 100, "vizinhos" => array("SC"), "acessoAgua" => true),
		array("id" => "SC", "svgId" => "BR-SC", "nome" => "Santa Catarina", "corMatiz" => 160, "corSaturacao" => 100, "vizinhos" => array("PR", "RS"), "acessoAgua" => true),
		array("id" => "SE", "svgId" => "BR-SE", "nome" => "Sergipe", "corMatiz" => 192, "corSaturacao" => 100, "vizinhos" => array("BA", "AL"), "acessoAgua" => true),
		array("id" => "SP", "svgId" => "BR-SP", "nome" => "São Paulo", "corMatiz" => 224, "corSaturacao" => 100, "vizinhos" => array("PR", "MS", "MG", "RJ"), "acessoAgua" => true),
		array("id" => "TO", "svgId" => "BR-TO", "nome" => "Tocantins", "corMatiz" => 256, "corSaturacao" => 100, "vizinhos" => array("GO", "MT", "PA", "MA", "PI", "BA"), "acessoAgua" => false)
	);

    foreach ($estrutura as $estadoData) {
        $jogador = new Jogador($estadoData);
        $jogador->idNome = $jogador->id;
        $jogador->nome = gerarNomeAleatorio();
        $jogadores[] = $jogador;
        $estadoData['controlador'] = $jogador;
        $estado = new Estado($estadoData);
        $estados[] = $estado;
    }

    registrarNoLog("Estados e jogadores inicializados");
}
function gerarNomeAleatorio() {
    $titulos = array("Ten", "Sgt", "Cmd", "Alm", "Cap", "Maj", "Cel", "Gen", "Cb");
    $animais = array("Tigre", "Onca", "Macaco", "Cavalo", "Leao", "Elefante", "Girafa", "Zebra", "Hipopotamo", "Rinoceronte", "Canguru", "Panda", "Lobo", "Raposa", "Urso", "Coelho", "Gato", "Cachorro", "Papagaio", "Arara");
    $arvores = array("Nogueira", "Palmeira", "Araucária", "Carvalho", "Cedro", "Eucalipto", "Figueira", "Ipê", "Jacarandá", "Jatobá", "Mangueira", "Paineira", "Pau-brasil", "Pinheiro", "Sibipiruna");

    $tentativas = 0;
    global $jogadores;
    do {
        $titulo = $titulos[array_rand($titulos)];
        $animal = $animais[array_rand($animais)];
        $arvore = $arvores[array_rand($arvores)];
        $nomeCompleto = $titulo . ". " . $animal . " " . $arvore;
        $nomeExistente = false;

        foreach ($jogadores as $jogador) {
            if ($jogador->nome === $nomeCompleto) {
                $nomeExistente = true;
                break;
            }
        }

        $tentativas++;
    } while ($nomeExistente && $tentativas < 10);

    if ($nomeExistente) {
        $nomeCompleto = uniqid();
    }
    return $nomeCompleto;
}
function avancarDataRodada() {
    global $dataTurno, $numTurnos;
    $dataTurno->modify('+1 month');
    $numTurnos++;
    registrarNoLog("Data avançada para: " . $dataTurno->format('F Y'));
}
function criarAcao($origem, TipoAcao $tipo, $destino = null, $agua = false) {
    global $acoes;
    $acao = new Acao($origem, $tipo, $destino, $agua);
    $acoes[] = $acao;
    registrarNoLog("Ação criada: {$tipo->toString($tipo)} de {$origem->id}" . ($destino ? " para {$destino->id}" : ""));
}
function executarAcoes() {
    global $acoes;
    foreach ($acoes as $acao) {
        registrarNoLog("Executando ação: {$acao->tipo->toString()} de {$acao->origem->id}" . ($acao->destino ? " para {$acao->destino->id}" : ""));
        $acao->executar();
    }
    $acoes = array_filter($acoes, function($acao) {
        return !$acao->excluir;
    });
}

// Defina a função de filtro
function filtrarAcoes($acao) {
    global $acaoDestino;
    return $acao->origem !== $acaoDestino;
}

// Defina a função de filtro para jogadores sem conexão
function filtrarJogadoresSemConexao($jogador) {
    return $jogador->usuario === null;
}

// Defina a função de filtro para jogadores humanos
function filtrarJogadoresHumanos($jogador) {
    return !$jogador->cpu;
}

#endregion





#region Inicialização servidor
// Registra uma nova sala no arquivo salas.json
$salas = json_decode(file_get_contents($salasFile), true);
$salas[] = ['nome' => $salaNome, 'pid' => $pid, 'data_abertura' => $dataAbertura];
file_put_contents($salasFile, json_encode($salas, JSON_PRETTY_PRINT));
registrarNoLog("Sala {$salaNome} criada com PID {$pid}");

inicializarEstadosEJogadores();

registrarNoLog("Servidor em execução!");



#endregion
// Exemplo de criação e execução de ações
// criarAcao($estados[0], TipoAcao::ATAQUE, $estados[1]);
// executarAcoes();














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

    verificarEstadoPartida();
    sleep(1);
}

fclose($server);
?>