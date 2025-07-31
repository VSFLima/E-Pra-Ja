<?php
// E-Pra-Já v3: Script Definitivo de Gerenciamento de Imagens
// Localização: /upload.php

header('Content-Type: application/json');

// --- 1. FUNÇÕES AUXILIARES ---
function send_response($success, $message, $data = [], $http_code = 200) {
    http_response_code($http_code);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit;
}

// --- 2. DETERMINAR A AÇÃO (UPLOAD OU DELETE) ---
$action = isset($_POST['action']) ? $_POST['action'] : 'upload';

if ($action === 'upload') {
    // --- LÓGICA DE UPLOAD ---

    // Validações de entrada
    if (!isset($_FILES['image']) || !isset($_POST['restauranteId']) || !isset($_POST['imageType'])) {
        send_response(false, 'Dados insuficientes para o upload.', [], 400);
    }

    $file = $_FILES['image'];
    $restauranteId = $_POST['restauranteId'];
    $imageType = $_POST['imageType']; // 'prato', 'perfil', ou 'capa'

    // Determina o nome do arquivo com base no tipo de imagem
    $filename_base = '';
    if ($imageType === 'prato') {
        if (!isset($_POST['pratoId'])) send_response(false, 'ID do prato é necessário.', [], 400);
        $filename_base = $_POST['pratoId'];
    } elseif ($imageType === 'perfil') {
        $filename_base = 'perfil';
    } elseif ($imageType === 'capa') {
        $filename_base = 'capa';
    } else {
        send_response(false, 'Tipo de imagem inválido.', [], 400);
    }

    // Cria o diretório do restaurante se não existir
    $target_dir = "uploads/" . basename($restauranteId) . "/";
    if (!file_exists($target_dir)) {
        mkdir($target_dir, 0777, true);
    }

    // Validações do arquivo
    if ($file['error']) send_response(false, 'Erro no upload: ' . $file['error'], [], 500);
    if ($file['size'] > 5 * 1024 * 1024) send_response(false, 'Arquivo muito grande. Máximo de 5MB.', [], 413);
    
    $allowed_types = ['image/jpeg', 'image/png', 'image/webp'];
    $mime_type = mime_content_type($file['tmp_name']);
    if (!in_array($mime_type, $allowed_types)) send_response(false, 'Tipo de arquivo não permitido.', [], 415);

    // Apaga a imagem antiga, se existir (com qualquer extensão)
    $old_files = glob($target_dir . $filename_base . ".*");
    foreach ($old_files as $old_file) {
        if (is_file($old_file)) {
            unlink($old_file);
        }
    }

    // Define o novo nome do arquivo
    $file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $new_filename = $filename_base . '.' . $file_extension;
    $target_file = $target_dir . $new_filename;

    // Move o arquivo para o destino final
    if (move_uploaded_file($file['tmp_name'], $target_file)) {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
        $domain = $_SERVER['HTTP_HOST'];
        $file_url = $protocol . $domain . '/' . $target_file;
        send_response(true, 'Upload bem-sucedido.', ['url' => $file_url]);
    } else {
        send_response(false, 'Erro ao salvar o arquivo no servidor.', [], 500);
    }

} elseif ($action === 'delete') {
    // --- LÓGICA DE EXCLUSÃO (focada em pratos) ---
    if (!isset($_POST['restauranteId']) || !isset($_POST['pratoId'])) {
        send_response(false, 'Dados insuficientes para a exclusão.', [], 400);
    }

    $restauranteId = $_POST['restauranteId'];
    $pratoId = $_POST['pratoId'];
    $target_dir = "uploads/" . basename($restauranteId) . "/";

    $files_to_delete = glob($target_dir . $pratoId . ".*");
    $deleted = false;
    foreach ($files_to_delete as $file_to_delete) {
        if (is_file($file_to_delete)) {
            unlink($file_to_delete);
            $deleted = true;
        }
    }

    if ($deleted) {
        send_response(true, 'Imagem do prato excluída com sucesso.');
    } else {
        send_response(false, 'Imagem do prato não encontrada para exclusão.', [], 404);
    }

} else {
    send_response(false, 'Ação inválida.', [], 400);
}
?>

