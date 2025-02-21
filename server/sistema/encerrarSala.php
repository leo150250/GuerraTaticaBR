<?php
$pathServidor = $_SERVER['DOCUMENT_ROOT'] . "/gtbrserver/";
if (isset($_GET['nome_sala'])) {
    $nomeSala = $_GET['nome_sala'];

	// Load the salas.json file
	$salasFile = $pathServidor . "sistema/.dados/salas.json";
	$salas = json_decode(file_get_contents($salasFile), true);

	// Find the sala with the given nome_sala
	$salaEncontrada = null;
	foreach ($salas as $sala) {
		if ($sala['nome'] === $nomeSala) {
			$salaEncontrada = $sala;
			break;
		}
	}

	if ($salaEncontrada) {
		$pid = $salaEncontrada['pid'];

        if (PHP_OS_FAMILY === 'Windows') {
            // Check if the process is running on Windows
            $command = "tasklist /FO CSV | findstr /I \"\\\"{$pid}\\\"\"";
            exec($command, $output, $result);

            if (empty($output)) {
                echo "Sala {$nomeSala} listada mas não encontrada. Eliminando do sistema...";
                exit;
            }
            // Terminate the process on Windows
            $command = "taskkill /F /PID {$pid}";
            exec($command, $output, $result);

            if ($result == 0) {
                echo "Sala {$nomeSala} encerrada com sucesso.";
                //unlink($pidFile); // Remove the PID file
            } else {
                echo "Falha ao encerrar a sala {$nomeSala} (" . $result . ") - " . implode("\n", $output);
            }
        } else {
            // Terminate the process on Unix-like systems
            if (posix_kill($pid, SIGTERM)) {
                echo "Sala {$nomeSala} encerrada com sucesso.";
                unlink($pidFile); // Remove the PID file
            } else {
                echo "Falha ao encerrar a sala {$nomeSala}.";
            }
        }
    } else {
        echo "Sala {$nomeSala} não encontrada.";
    }
} else {
    echo "Nome da sala não fornecido.";
}
?>