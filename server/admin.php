<?php
echo "<pre>";

$pathServidor = $_SERVER['DOCUMENT_ROOT'] . "/GuerraTaticaBR/server/";

// Verifica se a pasta de dados existe. Se não, cria ela, pois é uma instalação limpa.
if (!is_dir($pathServidor . "sistema/.dados/")) {
    try {
        echo "Criando pasta de dados do sistema...\n";
        mkdir($pathServidor . "sistema/.dados/", 0777, true);
        //Gera o HTACCESS para proteger a pasta de dados
        file_put_contents($pathServidor . "sistema/.dados/.htaccess", "Deny from all\n");
        echo "Pasta de dados criada com sucesso em " . $pathServidor . "sistema/.dados/\n";
    } catch (Exception $e) {
        die("Erro ao criar a pasta de dados do sistema: " . $e->getMessage()."\n");
    }
}

// Define the path to the JSON file
$jsonFilePath = $pathServidor . "sistema/.dados/salas.json";

// Check se o diretório existe, se não, cria
$dirPath = dirname($jsonFilePath);
if (!is_dir($dirPath)) {
    mkdir($dirPath, 0777, true);
}

// Check se o arquivo JSON existe, se não, cria
if (!file_exists($jsonFilePath)) {
    echo 'Arquivo salas.json não encontrado. Criando um novo...';
    file_put_contents($jsonFilePath, '[]');
}

// Obtém o conteúdo do arquivo JSON
$jsonContent = file_get_contents($jsonFilePath);

// Decodifica o conteúdo JSON em um array associativo
$salas = json_decode($jsonContent, true);

// Check se a decodificação foi bem-sucedida
if (json_last_error() !== JSON_ERROR_NONE) {
    die('Erro ao decodificar o arquivo JSON.');
}

// Exibe a lista de salas
echo '<h1>Lista de Salas</h1>';
echo '<button onclick="iniciarNovaSala()">Iniciar Nova Sala</button>';
echo '<button onclick="limparServidor()">Limpar Servidor</button>';
echo '<table border="1">';
echo '<tr><th>Nome</th><th>Data de Abertura</th><th>PID</th><th>Ações</th></tr>';

foreach ($salas as $sala) {
    $salaNome = htmlspecialchars($sala['nome']);
    $dataAbertura = htmlspecialchars($sala['data_abertura']);
    $pid = htmlspecialchars($sala['pid']);
    echo '<tr>';
    echo "<td>{$salaNome}</td>";
    echo "<td>{$dataAbertura}</td>";
    echo "<td>{$pid}</td>";
    echo "<td>
            <button onclick=\"toggleLog('{$salaNome}')\">Ver Log</button>
            <button onclick=\"enviarComando('{$salaNome}')\">Enviar Comando</button>
            <button onclick=\"encerrarSala('{$salaNome}')\">Encerrar Sala</button>
          </td>";
    echo '</tr>';
    echo "<tr id=\"log_{$salaNome}\" style=\"display:none;\"><td colspan=\"4\"><div id=\"logContent_{$salaNome}\"></div></td></tr>";
}

echo '</table>';
?>

<script>
let logIntervals = {};

function toggleLog(salaNome) {
    const logRow = document.getElementById(`log_${salaNome}`);
    const logContent = document.getElementById(`logContent_${salaNome}`);
    if (logRow.style.display === 'none') {
        logRow.style.display = '';
        fetchLog(salaNome, logContent);
        logIntervals[salaNome] = setInterval(() => fetchLog(salaNome, logContent), 1000);
    } else {
        logRow.style.display = 'none';
        clearInterval(logIntervals[salaNome]);
        delete logIntervals[salaNome];
    }
}

function fetchLog(salaNome, logContent) {
    fetch(`/gtbrserver/sistema/.dados/${salaNome}_log.txt`)
        .then(response => response.text())
        .then(data => {
            const lines = data.trim().split('\n');
            const lastLines = lines.slice(-20).join('<br>');
            logContent.innerHTML = lastLines;
        })
        .catch(error => {
            logContent.textContent = 'Erro ao carregar o log.';
        });
}

function enviarComando(salaNome) {
    const comando = prompt('Digite o comando a ser enviado:');
    if (comando) {
        fetch(`/gtbrserver/sistema/override.php?nome_sala=${salaNome}&comando=${encodeURIComponent(comando)}`)
            .then(response => response.text())
            .then(data => {
                alert(data);
            })
            .catch(error => {
                alert('Erro ao enviar o comando:' + error);
            });
    }
}

function encerrarSala(salaNome) {
    if (confirm('Tem certeza que deseja encerrar o processo desta sala?')) {
        fetch(`/gtbrserver/sistema/encerrarSala.php?nome_sala=${salaNome}`)
            .then(response => response.text())
            .then(data => {
                alert(data);
                location.reload(); // Atualiza a página
            })
            .catch(error => {
                alert('Erro ao encerrar a sala:' + error);
            });
    }
}

function iniciarNovaSala() {
    fetch('/gtbrserver/index.php?novo');
    alert('Iniciando nova sala...');
    location.reload(); // Atualiza a página
}

function limparServidor() {
    if (confirm('Tem certeza que deseja limpar o servidor?')) {
        fetch('/gtbrserver/sistema/limparServidor.php')
            .then(() => {
                location.reload(); // Atualiza a página
            })
            .catch(error => {
                alert('Erro ao limpar o servidor:' + error);
            });
    }
}
</script>