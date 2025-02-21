<?php
// Define the path to the JSON file
$jsonFilePath = "/sistema/.dados/salas.json";

if (!file_exists($jsonFilePath)) {
	echo 'Arquivo salas.json não encontrado. Criando um novo...';
	file_put_contents("Teste.txt", '[]');
}

// Get the content of the JSON file
$jsonContent = file_get_contents($jsonFilePath);

// Decode the JSON content into an associative array
$salas = json_decode($jsonContent, true);

// Check if the decoding was successful
if (json_last_error() !== JSON_ERROR_NONE) {
	die('Erro ao decodificar o arquivo JSON.');
}

// Display the list of rooms
echo '<h1>Lista de Salas</h1>';
echo '<table border="1">';
echo '<tr><th>Nome</th><th>Data de Abertura</th><th>PID</th></tr>';

foreach ($salas as $sala) {
	echo '<tr>';
	echo '<td>' . htmlspecialchars($sala['nome']) . '</td>';
	echo '<td>' . htmlspecialchars($sala['data_abertura']) . '</td>';
	echo '<td>' . htmlspecialchars($sala['pid']) . '</td>';
	echo '</tr>';
}

echo '</table>';
?>