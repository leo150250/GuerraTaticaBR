<?php
$pathServidor = $_SERVER['DOCUMENT_ROOT'] . "/gtbrserver/";

// Obtém o nome da sala via GET
$nomeSala = isset($_GET['nome_sala']) ? $_GET['nome_sala'] : null;

// Obtém o comando via GET
$comando = isset($_GET['comando']) ? $_GET['comando'] : null;

if ($nomeSala && $comando) {
	// Caminho do arquivo override da sala
	$overrideFilePath = $pathServidor . "sistema/.dados/{$nomeSala}_override.json";

	// Verifica se o arquivo existe
	if (file_exists($overrideFilePath)) {
		// Lê o conteúdo do arquivo JSON
		$conteudoOverride = file_get_contents($overrideFilePath);
		$dadosOverride = json_decode($conteudoOverride, true);

		// Adiciona o comando ao JSON da sala
		$dadosOverride[] = $comando;

		// Salva o JSON atualizado de volta no arquivo
		file_put_contents($overrideFilePath, json_encode($dadosOverride, JSON_PRETTY_PRINT));
		
		echo "Comando adicionado com sucesso.";
	} else {
		echo "Sala não encontrada.";
	}
} else {
	echo "Parâmetros 'nome_sala' e 'comando' são obrigatórios.";
}
?>