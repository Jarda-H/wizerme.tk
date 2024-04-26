<?php
error_reporting(0);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

function console_log($data)
{
    echo "<script>console.log('" . $data . "');</script>";
}

if (empty($_POST['i'])) {
    echo json_encode([
        "status" => 0,
        "html" => '404'
    ]);
    die;
}

$id = $_POST['i'];

if (str_contains($id, 'app.wizer.me/learn')) {
    $id = substr($id, strrpos($id, '/') + 1);
}

$vysledky_request = "https://app.wizer.me/learn/worksheet/" . $id; //$_GET['i']
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $vysledky_request);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$output = curl_exec($ch);
$errorcatch = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($errorcatch != 200) {
    echo json_encode([
        "status" => 0,
        "html" => '404'
    ]);
    die;
}
$data = json_decode($output, true);
$html = '';
$html .= '<a href="#" id="ReloadBack"><i class="fa-solid fa-caret-left"></i> Zpět</a>
<div class="api-result">'; //start block with answers

$fotky = 0;
$name = (isset($data['worksheet']['name'])) ? $data['worksheet']['name'] : 'jméno se nepodařilo získat';
$worksheet_id = $id;
if (isset($data['worksheet']['shortThumbnail'])) {
    $worksheet_img = $data['worksheet']['shortThumbnail'];
} else {
    if (isset($data['worksheet']['thumbnail'])) {
        $worksheet_img = $data['worksheet']['thumbnail'];
    } else {
        $worksheet_img = "/img/pepega.png";
    }
}

foreach ($data['worksheet']['widgets'] as $w) {
    $typ = $w['type'];
    $jmeno_elementu = $w['name'];
    if ($typ == "content") {
        //   console_log("Content - $jmeno_elementu - " . $w['data']['title']);
    } elseif ($typ == "question") {
        $title = strip_tags($w['data']['title']);
        $html .= <<<HTML
        <div class="widget">
            <div class="widget-in">
                <div class="title"><h1>{$title}</h1></div>
HTML;
        switch ($jmeno_elementu) {
            case "Sorting": //razeni
                foreach ($w['data']['groups'] as $elem) {
                    $ans = '';
                    foreach ($elem['items'] as $ith) {
                        $text = strip_tags($ith['text']);
                        $ans .= "<li class=\"answer\">{$text}</li>";
                    }
                    //heading text
                    if (!empty($elem['header']['text'])) $html .= '<p>' .  strip_tags($elem['header']['text']) . "</p>";
                    //img
                    if (isset($elem['header']['media']['image']) and !empty($ans)) $html .= "<img class=\"sorting\" src=\"{$elem['header']['media']['image']}\">";
                    if (!empty($ans)) $html .= $ans;
                }
                break;
                //
            case "Multiple Choice": //abc / multiple choice..
                foreach ($w['data']['options'] as $elem) {
                    if (isset($elem['checked']) && $elem['checked'] == "true") {
                        $html .= '<p>' .  strip_tags($elem['text']) . "</p>";
                    }
                }
                break;
                //
            case "Blanks": //Blanks
                $co = array("<wmblank>", "</wmblank>");
                $cim = array('<span class="important-string">', "</span>");
                $html .= str_replace($co, $cim, $w['data']['blankText']);
                break;
                //
            case "Matching": //Matching
                foreach ($w['data']['pairs'] as $elem) {
                    if (isset($elem['target']['value']) && isset($elem['target']['media']['image'])) {
                        $img = $elem['target']['media']['image'];
                        $target = <<<HTML
                        <img src="$img" style="width: 40px">
                        HTML;
                    } else {
                        $target = strip_tags($elem['target']['value']);
                    }
                    $html .= '<p>' .  $target . " - " . strip_tags($elem['match']['value']) . '</p>';
                }
                break;
            case "Table": //Table - nahore zadani - dole odpoved(i)
                $offset_r = $w['data']['numberOfRows'] - 1; // offset for json / rows
                $offset_c = $w['data']['numberOfCols']; // offset for json / colons
                if ($w['data']['numberOfRows'] == 2) {
                    for ($r = 0; $r < $offset_r; $r++) { // rows
                        for ($c = 0; $c < $w['data']['numberOfCols']; $c++) { // colons
                            $r1 = $r + 1;
                            $html .=  "<p>" . strip_tags($w['data']['tablerows'][$r]['cols'][$c]['text']) . ' - <span class="important-string">';
                            $html .= strip_tags($w['data']['tablerows'][$r1]['cols'][$c]['text']) . '</span></p>';
                        }
                    }
                } else { //more than 2 row
                    /// modal here
                    $html .= ' <button id="myBtn" class="modal-btn">Otevřít</button>
                    <div id="myModal" class="modal">
                    <div class="modal-content">
                    <span class="close">&times;</span>';
                    //r 0
                    $html .=  "<table><tbody><tr>";
                    for ($c = 0; $c < $offset_c; $c++) { //header col
                        $html .=  "<th>" . strip_tags($w['data']['tablerows'][0]['cols'][$c]['text']) . '</th>';
                    }
                    $html .= "</tr>";
                    //r 0 end
                    for ($r = 1; $r < $w['data']['numberOfRows']; $r++) { // rows
                        //if not header
                        $html .= "<tr>";
                        for ($c = 0; $c < $offset_c; $c++) { // colons
                            $html .= '<td class="important-string">' . strip_tags($w['data']['tablerows'][$r]['cols'][$c]['text']) . '</td>';
                        }
                        $html .= "</tr>";
                    }
                    $html .= "</tbody></table>
                    </div>
                    </div>";
                }
                break;
            case "Fill On An Image":
                $text = '';
                $text .= <<<HTML
                <div class="popup-modal">
                    <a id="$fotky" data-modal="#modal-$fotky">Otevřít</a>
                </div>
                <div id="modal-$fotky" class="fill-on-img" style="display:none">
                <div style="display: inline-block;border: none;position: relative;max-width: 100%;width: 100%;">
                <img src="{$w['data']['image']['url']}">
HTML;
                foreach ($w['data']['tags'] as $elem) {
                    $pos1 = ($elem['left'] == true) ? 'left' : 'right';
                    $pos2 = ($elem['top'] == true) ? 'top' : 'bottom';
                    $x = $elem['positionX'];
                    $y = $elem['positionY'];
                    $text .= "<div class=\"on-img-text\" style=\"position: absolute;$pos1: $x;$pos2: $y;\">" .  strip_tags($elem['text']) . '</div>';
                    // $text .= '<p>' . strip_tags($elem['text']) . '</p>';
                }
                $text .= "</div></div>";
                $html .= $text;

                $fotky++;
                break;
            case "Word Search Puzzle":
                $html .= '<p>I think you can do this by yourself <img src="/img/pepega.png"></p>';
                break;
            default:
                break;
        }
        $html .= "</div>"; //windget in - end div
        $html .= "</div>"; //one block - end div
    }
}
$html .= '</div>'; //end block with answers


echo json_encode([
    "status" => 1,
    "name" => $name,
    "time" => time(),
    "id" => $worksheet_id,
    "img" => $worksheet_img,
    "html" => $html
]);
