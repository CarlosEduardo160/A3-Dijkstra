/* =====================================================================
   ROTAS DO METRÔ DE SP — GRAFO + ALGORITMO DE DIJKSTRA
   Linhas do grupo: 1-Azul | 3-Vermelha | 5-Lilás | 10-Turquesa | 11-Coral
   =====================================================================

   COMO ESTE ARQUIVO ESTÁ ORGANIZADO
     PARTE 1 - DADOS:          MEU_JSON (estações e ligações, vindas da planilha do grupo)
     PARTE 2 - LÓGICA:         construirGrafo, popularSelects, dijkstra, calcularERexibir
     PARTE 3 - INICIALIZAÇÃO:  monta o grafo e preenche as listas quando a página carrega

   O QUE O HTML PRECISA TER (são os ids que o código procura na página)

     <select id="origem"></select>
     <select id="destino"></select>
     <select id="criterio">      <!-- opcional: sem ele, o cálculo usa "km" -->
       <option value="km">Menor distância (km)</option>
       <option value="comum">Menor tempo - dia normal (min)</option>
       <option value="pico">Menor tempo - horário de pico (min)</option>
       <option value="chuva">Menor tempo - dia de chuva (min)</option>
     </select>
     <button onclick="calcularERexibir()">Calcular</button>
     <div id="resultado" style="display:none">
       <div id="resumo"></div>
       <ul id="passos"></ul>
     </div>

   Se este arquivo for carregado com <script src="...">, coloque a tag no
   FINAL do <body>, para os elementos acima já existirem quando o código rodar.
   ===================================================================== */


/* =====================================================================
   PARTE 1 — DADOS
   =====================================================================

   O mapa do metrô é descrito como um GRAFO: um conjunto de NÓS (pontos)
   ligados por ARESTAS (os "fios" entre os pontos).

   NÓS ("nos")
     Cada nó é uma estação EM UMA LINHA. Uma estação de integração vira
     vários nós. Ex.: "Luz (Azul)" e "Luz (Coral)" são nós diferentes,
     porque para ir de uma plataforma à outra o passageiro faz baldeação,
     e baldeação custa tempo. Assim o algoritmo "enxerga" esse custo.
       "id"    -> nome único do nó, no formato "Estação (Linha)"
       "linha" -> nome da linha

   ARESTAS ("arestas")
     Cada aresta liga dois nós. Os ids em "origem" e "destino" precisam
     existir em "nos" e estar escritos exatamente igual.
       "tipo"   -> "linha"         = trecho entre estações vizinhas da MESMA linha
                   "transferencia" = baldeação entre duas linhas na MESMA estação
       "km", "comum", "pico", "chuva" -> os 4 CUSTOS da aresta, que vêm
                   das colunas da planilha:
                     km    = Distancia_km      (distância, em km)
                     comum = Tempo_comum_min   (tempo em dia normal, em minutos)
                     pico  = Tempo_pico_min    (tempo no horário de pico, em minutos)
                     chuva = Tempo_chuva_min   (tempo em dia de chuva, em minutos)
       O algoritmo usa UM desses custos por vez (o usuário escolhe na tela).

   Cada ligação aparece UMA só vez aqui. Como ida e volta têm o mesmo
   custo, a função construirGrafo() registra os dois sentidos sozinha.

   OBSERVAÇÕES SOBRE A CONVERSÃO DA PLANILHA
     - Baldeação tem 0.0 km na planilha (só tem tempo). Por isso, no critério
       "km", caminhos com baldeação podem empatar com outros de mesma distância.
     - Foram mantidas só as linhas da planilha. Baldeações para linhas que
       não estão nela (Rubi, Diamante, Jade, Amarela, Safira, Verde e
       Esmeralda) ficaram de fora, pois não há estações dessas linhas no grafo.
     - A planilha traz uma baldeação Turquesa -> Coral em Palmeiras-Barra Funda,
       mas a Coral da planilha começa na Luz, então esse nó não existe e a
       ligação foi omitida.
     - Nomes com "•" ou " - " foram padronizados com hífen
       (ex.: "Corinthians-Itaquera").
   ===================================================================== */

const MEU_JSON = {
  "nos": [
    // ---- Linha 10 - Turquesa ----
    {"id": "Palmeiras-Barra Funda (Turquesa)", "linha": "Turquesa"},
    {"id": "Luz (Turquesa)", "linha": "Turquesa"},
    {"id": "Brás (Turquesa)", "linha": "Turquesa"},
    {"id": "Juventus-Mooca (Turquesa)", "linha": "Turquesa"},
    {"id": "Ipiranga (Turquesa)", "linha": "Turquesa"},
    {"id": "Tamanduateí (Turquesa)", "linha": "Turquesa"},
    {"id": "São Caetano do Sul (Turquesa)", "linha": "Turquesa"},
    {"id": "Utinga (Turquesa)", "linha": "Turquesa"},
    {"id": "Prefeito Saladino (Turquesa)", "linha": "Turquesa"},
    {"id": "Santo André (Turquesa)", "linha": "Turquesa"},
    {"id": "Capuava (Turquesa)", "linha": "Turquesa"},
    {"id": "Mauá (Turquesa)", "linha": "Turquesa"},
    {"id": "Guapituba (Turquesa)", "linha": "Turquesa"},
    {"id": "Ribeirão Pires (Turquesa)", "linha": "Turquesa"},
    {"id": "Rio Grande da Serra (Turquesa)", "linha": "Turquesa"},
    // ---- Linha 3 - Vermelha ----
    {"id": "Palmeiras-Barra Funda (Vermelha)", "linha": "Vermelha"},
    {"id": "Marechal Deodoro (Vermelha)", "linha": "Vermelha"},
    {"id": "Santa Cecília (Vermelha)", "linha": "Vermelha"},
    {"id": "República (Vermelha)", "linha": "Vermelha"},
    {"id": "Anhangabaú (Vermelha)", "linha": "Vermelha"},
    {"id": "Sé (Vermelha)", "linha": "Vermelha"},
    {"id": "Pedro II (Vermelha)", "linha": "Vermelha"},
    {"id": "Brás (Vermelha)", "linha": "Vermelha"},
    {"id": "Bresser-Mooca (Vermelha)", "linha": "Vermelha"},
    {"id": "Belém (Vermelha)", "linha": "Vermelha"},
    {"id": "Tatuapé (Vermelha)", "linha": "Vermelha"},
    {"id": "Carrão (Vermelha)", "linha": "Vermelha"},
    {"id": "Penha (Vermelha)", "linha": "Vermelha"},
    {"id": "Vila Matilde (Vermelha)", "linha": "Vermelha"},
    {"id": "Guilhermina-Esperança (Vermelha)", "linha": "Vermelha"},
    {"id": "Patriarca (Vermelha)", "linha": "Vermelha"},
    {"id": "Artur Alvim (Vermelha)", "linha": "Vermelha"},
    {"id": "Corinthians-Itaquera (Vermelha)", "linha": "Vermelha"},
    // ---- Linha 5 - Lilás ----
    {"id": "Capão Redondo (Lilás)", "linha": "Lilás"},
    {"id": "Campo Limpo (Lilás)", "linha": "Lilás"},
    {"id": "Vila das Belezas (Lilás)", "linha": "Lilás"},
    {"id": "Giovanni Gronchi (Lilás)", "linha": "Lilás"},
    {"id": "Santo Amaro (Lilás)", "linha": "Lilás"},
    {"id": "Largo Treze (Lilás)", "linha": "Lilás"},
    {"id": "Adolfo Pinheiro (Lilás)", "linha": "Lilás"},
    {"id": "Alto da Boa Vista (Lilás)", "linha": "Lilás"},
    {"id": "Borba Gato (Lilás)", "linha": "Lilás"},
    {"id": "Brooklin (Lilás)", "linha": "Lilás"},
    {"id": "Campo Belo (Lilás)", "linha": "Lilás"},
    {"id": "Eucaliptos (Lilás)", "linha": "Lilás"},
    {"id": "Moema (Lilás)", "linha": "Lilás"},
    {"id": "AACD-Servidor (Lilás)", "linha": "Lilás"},
    {"id": "Hospital São Paulo (Lilás)", "linha": "Lilás"},
    {"id": "Santa Cruz (Lilás)", "linha": "Lilás"},
    {"id": "Chácara Klabin (Lilás)", "linha": "Lilás"},
    // ---- Linha 1 - Azul ----
    {"id": "Tucuruvi (Azul)", "linha": "Azul"},
    {"id": "Parada Inglesa (Azul)", "linha": "Azul"},
    {"id": "Jardim São Paulo-Ayrton Senna (Azul)", "linha": "Azul"},
    {"id": "Santana (Azul)", "linha": "Azul"},
    {"id": "Carandiru (Azul)", "linha": "Azul"},
    {"id": "Portuguesa-Tietê (Azul)", "linha": "Azul"},
    {"id": "Armênia (Azul)", "linha": "Azul"},
    {"id": "Tiradentes (Azul)", "linha": "Azul"},
    {"id": "Luz (Azul)", "linha": "Azul"},
    {"id": "São Bento (Azul)", "linha": "Azul"},
    {"id": "Sé (Azul)", "linha": "Azul"},
    {"id": "Japão-Liberdade (Azul)", "linha": "Azul"},
    {"id": "São Joaquim (Azul)", "linha": "Azul"},
    {"id": "Vergueiro (Azul)", "linha": "Azul"},
    {"id": "Paraíso (Azul)", "linha": "Azul"},
    {"id": "Ana Rosa (Azul)", "linha": "Azul"},
    {"id": "Vila Mariana (Azul)", "linha": "Azul"},
    {"id": "Santa Cruz (Azul)", "linha": "Azul"},
    {"id": "Praça da Árvore (Azul)", "linha": "Azul"},
    {"id": "Saúde Ultrafarma (Azul)", "linha": "Azul"},
    {"id": "São Judas (Azul)", "linha": "Azul"},
    {"id": "Conceição (Azul)", "linha": "Azul"},
    {"id": "Jabaquara (Azul)", "linha": "Azul"},
    // ---- Linha 11 - Coral ----
    {"id": "Luz (Coral)", "linha": "Coral"},
    {"id": "Brás (Coral)", "linha": "Coral"},
    {"id": "Tatuapé (Coral)", "linha": "Coral"},
    {"id": "Corinthians-Itaquera (Coral)", "linha": "Coral"},
    {"id": "Dom Bosco (Coral)", "linha": "Coral"},
    {"id": "José Bonifácio (Coral)", "linha": "Coral"},
    {"id": "Guaianases (Coral)", "linha": "Coral"},
    {"id": "Antônio Gianetti Neto (Coral)", "linha": "Coral"},
    {"id": "Ferraz de Vasconcelos (Coral)", "linha": "Coral"},
    {"id": "Poá (Coral)", "linha": "Coral"},
    {"id": "Calmon Viana (Coral)", "linha": "Coral"},
    {"id": "Suzano (Coral)", "linha": "Coral"},
    {"id": "Jundiapeba (Coral)", "linha": "Coral"},
    {"id": "Braz Cubas (Coral)", "linha": "Coral"},
    {"id": "Mogi das Cruzes (Coral)", "linha": "Coral"},
    {"id": "Estudantes (Coral)", "linha": "Coral"}
  ],

  "arestas": [
    // ---- Linha 10 - Turquesa: trechos entre estações vizinhas ----
    {"origem": "Palmeiras-Barra Funda (Turquesa)", "destino": "Luz (Turquesa)", "tipo": "linha", "km": 3.5, "comum": 4.9, "pico": 5.5, "chuva": 5.8},
    {"origem": "Luz (Turquesa)", "destino": "Brás (Turquesa)", "tipo": "linha", "km": 2.1, "comum": 3.2, "pico": 3.8, "chuva": 3.9},
    {"origem": "Brás (Turquesa)", "destino": "Juventus-Mooca (Turquesa)", "tipo": "linha", "km": 2.7, "comum": 3.9, "pico": 4.5, "chuva": 4.7},
    {"origem": "Juventus-Mooca (Turquesa)", "destino": "Ipiranga (Turquesa)", "tipo": "linha", "km": 3.0, "comum": 4.3, "pico": 4.9, "chuva": 5.1},
    {"origem": "Ipiranga (Turquesa)", "destino": "Tamanduateí (Turquesa)", "tipo": "linha", "km": 1.9, "comum": 3.0, "pico": 3.5, "chuva": 3.6},
    {"origem": "Tamanduateí (Turquesa)", "destino": "São Caetano do Sul (Turquesa)", "tipo": "linha", "km": 4.1, "comum": 5.6, "pico": 6.3, "chuva": 6.6},
    {"origem": "São Caetano do Sul (Turquesa)", "destino": "Utinga (Turquesa)", "tipo": "linha", "km": 2.9, "comum": 4.2, "pico": 4.8, "chuva": 4.9},
    {"origem": "Utinga (Turquesa)", "destino": "Prefeito Saladino (Turquesa)", "tipo": "linha", "km": 2.0, "comum": 3.1, "pico": 3.6, "chuva": 3.7},
    {"origem": "Prefeito Saladino (Turquesa)", "destino": "Santo André (Turquesa)", "tipo": "linha", "km": 1.8, "comum": 2.9, "pico": 3.4, "chuva": 3.5},
    {"origem": "Santo André (Turquesa)", "destino": "Capuava (Turquesa)", "tipo": "linha", "km": 4.0, "comum": 5.5, "pico": 6.2, "chuva": 6.4},
    {"origem": "Capuava (Turquesa)", "destino": "Mauá (Turquesa)", "tipo": "linha", "km": 2.6, "comum": 3.8, "pico": 4.4, "chuva": 4.5},
    {"origem": "Mauá (Turquesa)", "destino": "Guapituba (Turquesa)", "tipo": "linha", "km": 3.4, "comum": 4.8, "pico": 5.4, "chuva": 5.6},
    {"origem": "Guapituba (Turquesa)", "destino": "Ribeirão Pires (Turquesa)", "tipo": "linha", "km": 4.8, "comum": 6.5, "pico": 7.2, "chuva": 7.5},
    {"origem": "Ribeirão Pires (Turquesa)", "destino": "Rio Grande da Serra (Turquesa)", "tipo": "linha", "km": 4.8, "comum": 6.5, "pico": 7.2, "chuva": 7.5},
    // ---- Linha 3 - Vermelha: trechos entre estações vizinhas ----
    {"origem": "Palmeiras-Barra Funda (Vermelha)", "destino": "Marechal Deodoro (Vermelha)", "tipo": "linha", "km": 1.7, "comum": 2.8, "pico": 3.5, "chuva": 3.1},
    {"origem": "Marechal Deodoro (Vermelha)", "destino": "Santa Cecília (Vermelha)", "tipo": "linha", "km": 1.1, "comum": 2.0, "pico": 2.6, "chuva": 2.2},
    {"origem": "Santa Cecília (Vermelha)", "destino": "República (Vermelha)", "tipo": "linha", "km": 1.0, "comum": 1.9, "pico": 2.4, "chuva": 2.1},
    {"origem": "República (Vermelha)", "destino": "Anhangabaú (Vermelha)", "tipo": "linha", "km": 0.8, "comum": 1.6, "pico": 2.2, "chuva": 1.8},
    {"origem": "Anhangabaú (Vermelha)", "destino": "Sé (Vermelha)", "tipo": "linha", "km": 0.9, "comum": 1.7, "pico": 2.3, "chuva": 1.9},
    {"origem": "Sé (Vermelha)", "destino": "Pedro II (Vermelha)", "tipo": "linha", "km": 1.1, "comum": 2.0, "pico": 2.6, "chuva": 2.2},
    {"origem": "Pedro II (Vermelha)", "destino": "Brás (Vermelha)", "tipo": "linha", "km": 1.1, "comum": 2.0, "pico": 2.6, "chuva": 2.2},
    {"origem": "Brás (Vermelha)", "destino": "Bresser-Mooca (Vermelha)", "tipo": "linha", "km": 1.2, "comum": 2.2, "pico": 2.7, "chuva": 2.4},
    {"origem": "Bresser-Mooca (Vermelha)", "destino": "Belém (Vermelha)", "tipo": "linha", "km": 1.1, "comum": 2.0, "pico": 2.6, "chuva": 2.2},
    {"origem": "Belém (Vermelha)", "destino": "Tatuapé (Vermelha)", "tipo": "linha", "km": 2.0, "comum": 3.3, "pico": 3.9, "chuva": 3.5},
    {"origem": "Tatuapé (Vermelha)", "destino": "Carrão (Vermelha)", "tipo": "linha", "km": 1.3, "comum": 2.3, "pico": 2.9, "chuva": 2.5},
    {"origem": "Carrão (Vermelha)", "destino": "Penha (Vermelha)", "tipo": "linha", "km": 1.7, "comum": 2.8, "pico": 3.5, "chuva": 3.1},
    {"origem": "Penha (Vermelha)", "destino": "Vila Matilde (Vermelha)", "tipo": "linha", "km": 1.2, "comum": 2.2, "pico": 2.7, "chuva": 2.4},
    {"origem": "Vila Matilde (Vermelha)", "destino": "Guilhermina-Esperança (Vermelha)", "tipo": "linha", "km": 1.4, "comum": 2.4, "pico": 3.0, "chuva": 2.7},
    {"origem": "Guilhermina-Esperança (Vermelha)", "destino": "Patriarca (Vermelha)", "tipo": "linha", "km": 1.1, "comum": 2.0, "pico": 2.6, "chuva": 2.2},
    {"origem": "Patriarca (Vermelha)", "destino": "Artur Alvim (Vermelha)", "tipo": "linha", "km": 1.9, "comum": 3.1, "pico": 3.7, "chuva": 3.4},
    {"origem": "Artur Alvim (Vermelha)", "destino": "Corinthians-Itaquera (Vermelha)", "tipo": "linha", "km": 1.4, "comum": 2.4, "pico": 3.0, "chuva": 2.7},
    // ---- Linha 5 - Lilás: trechos entre estações vizinhas ----
    {"origem": "Capão Redondo (Lilás)", "destino": "Campo Limpo (Lilás)", "tipo": "linha", "km": 2.1, "comum": 3.3, "pico": 4.0, "chuva": 3.7},
    {"origem": "Campo Limpo (Lilás)", "destino": "Vila das Belezas (Lilás)", "tipo": "linha", "km": 1.5, "comum": 2.5, "pico": 3.1, "chuva": 2.8},
    {"origem": "Vila das Belezas (Lilás)", "destino": "Giovanni Gronchi (Lilás)", "tipo": "linha", "km": 1.3, "comum": 2.3, "pico": 2.8, "chuva": 2.5},
    {"origem": "Giovanni Gronchi (Lilás)", "destino": "Santo Amaro (Lilás)", "tipo": "linha", "km": 1.7, "comum": 2.8, "pico": 3.4, "chuva": 3.1},
    {"origem": "Santo Amaro (Lilás)", "destino": "Largo Treze (Lilás)", "tipo": "linha", "km": 1.1, "comum": 2.0, "pico": 2.6, "chuva": 2.2},
    {"origem": "Largo Treze (Lilás)", "destino": "Adolfo Pinheiro (Lilás)", "tipo": "linha", "km": 1.0, "comum": 1.9, "pico": 2.4, "chuva": 2.1},
    {"origem": "Adolfo Pinheiro (Lilás)", "destino": "Alto da Boa Vista (Lilás)", "tipo": "linha", "km": 1.2, "comum": 2.1, "pico": 2.7, "chuva": 2.4},
    {"origem": "Alto da Boa Vista (Lilás)", "destino": "Borba Gato (Lilás)", "tipo": "linha", "km": 1.0, "comum": 1.9, "pico": 2.4, "chuva": 2.1},
    {"origem": "Borba Gato (Lilás)", "destino": "Brooklin (Lilás)", "tipo": "linha", "km": 1.0, "comum": 1.9, "pico": 2.4, "chuva": 2.1},
    {"origem": "Brooklin (Lilás)", "destino": "Campo Belo (Lilás)", "tipo": "linha", "km": 1.4, "comum": 2.4, "pico": 3.0, "chuva": 2.7},
    {"origem": "Campo Belo (Lilás)", "destino": "Eucaliptos (Lilás)", "tipo": "linha", "km": 1.3, "comum": 2.3, "pico": 2.8, "chuva": 2.5},
    {"origem": "Eucaliptos (Lilás)", "destino": "Moema (Lilás)", "tipo": "linha", "km": 1.1, "comum": 2.0, "pico": 2.6, "chuva": 2.2},
    {"origem": "Moema (Lilás)", "destino": "AACD-Servidor (Lilás)", "tipo": "linha", "km": 1.2, "comum": 2.1, "pico": 2.7, "chuva": 2.4},
    {"origem": "AACD-Servidor (Lilás)", "destino": "Hospital São Paulo (Lilás)", "tipo": "linha", "km": 1.0, "comum": 1.9, "pico": 2.4, "chuva": 2.1},
    {"origem": "Hospital São Paulo (Lilás)", "destino": "Santa Cruz (Lilás)", "tipo": "linha", "km": 1.1, "comum": 2.0, "pico": 2.6, "chuva": 2.2},
    {"origem": "Santa Cruz (Lilás)", "destino": "Chácara Klabin (Lilás)", "tipo": "linha", "km": 1.0, "comum": 1.9, "pico": 2.4, "chuva": 2.1},
    // ---- Linha 1 - Azul: trechos entre estações vizinhas ----
    {"origem": "Tucuruvi (Azul)", "destino": "Parada Inglesa (Azul)", "tipo": "linha", "km": 0.9, "comum": 1.8, "pico": 2.4, "chuva": 2.0},
    {"origem": "Parada Inglesa (Azul)", "destino": "Jardim São Paulo-Ayrton Senna (Azul)", "tipo": "linha", "km": 1.0, "comum": 2.0, "pico": 2.5, "chuva": 2.2},
    {"origem": "Jardim São Paulo-Ayrton Senna (Azul)", "destino": "Santana (Azul)", "tipo": "linha", "km": 1.1, "comum": 2.1, "pico": 2.7, "chuva": 2.3},
    {"origem": "Santana (Azul)", "destino": "Carandiru (Azul)", "tipo": "linha", "km": 0.9, "comum": 1.8, "pico": 2.4, "chuva": 2.0},
    {"origem": "Carandiru (Azul)", "destino": "Portuguesa-Tietê (Azul)", "tipo": "linha", "km": 1.1, "comum": 2.1, "pico": 2.7, "chuva": 2.3},
    {"origem": "Portuguesa-Tietê (Azul)", "destino": "Armênia (Azul)", "tipo": "linha", "km": 0.9, "comum": 1.8, "pico": 2.4, "chuva": 2.0},
    {"origem": "Armênia (Azul)", "destino": "Tiradentes (Azul)", "tipo": "linha", "km": 1.0, "comum": 2.0, "pico": 2.5, "chuva": 2.2},
    {"origem": "Tiradentes (Azul)", "destino": "Luz (Azul)", "tipo": "linha", "km": 0.9, "comum": 1.8, "pico": 2.4, "chuva": 2.0},
    {"origem": "Luz (Azul)", "destino": "São Bento (Azul)", "tipo": "linha", "km": 0.8, "comum": 1.7, "pico": 2.2, "chuva": 1.9},
    {"origem": "São Bento (Azul)", "destino": "Sé (Azul)", "tipo": "linha", "km": 0.8, "comum": 1.7, "pico": 2.2, "chuva": 1.9},
    {"origem": "Sé (Azul)", "destino": "Japão-Liberdade (Azul)", "tipo": "linha", "km": 0.6, "comum": 1.4, "pico": 1.9, "chuva": 1.6},
    {"origem": "Japão-Liberdade (Azul)", "destino": "São Joaquim (Azul)", "tipo": "linha", "km": 0.8, "comum": 1.7, "pico": 2.2, "chuva": 1.9},
    {"origem": "São Joaquim (Azul)", "destino": "Vergueiro (Azul)", "tipo": "linha", "km": 0.9, "comum": 1.8, "pico": 2.4, "chuva": 2.0},
    {"origem": "Vergueiro (Azul)", "destino": "Paraíso (Azul)", "tipo": "linha", "km": 0.9, "comum": 1.8, "pico": 2.4, "chuva": 2.0},
    {"origem": "Paraíso (Azul)", "destino": "Ana Rosa (Azul)", "tipo": "linha", "km": 0.7, "comum": 1.5, "pico": 2.1, "chuva": 1.7},
    {"origem": "Ana Rosa (Azul)", "destino": "Vila Mariana (Azul)", "tipo": "linha", "km": 0.9, "comum": 1.8, "pico": 2.4, "chuva": 2.0},
    {"origem": "Vila Mariana (Azul)", "destino": "Santa Cruz (Azul)", "tipo": "linha", "km": 1.0, "comum": 2.0, "pico": 2.5, "chuva": 2.2},
    {"origem": "Santa Cruz (Azul)", "destino": "Praça da Árvore (Azul)", "tipo": "linha", "km": 1.1, "comum": 2.1, "pico": 2.7, "chuva": 2.3},
    {"origem": "Praça da Árvore (Azul)", "destino": "Saúde Ultrafarma (Azul)", "tipo": "linha", "km": 0.8, "comum": 1.7, "pico": 2.2, "chuva": 1.9},
    {"origem": "Saúde Ultrafarma (Azul)", "destino": "São Judas (Azul)", "tipo": "linha", "km": 0.8, "comum": 1.7, "pico": 2.2, "chuva": 1.9},
    {"origem": "São Judas (Azul)", "destino": "Conceição (Azul)", "tipo": "linha", "km": 1.2, "comum": 2.2, "pico": 2.8, "chuva": 2.5},
    {"origem": "Conceição (Azul)", "destino": "Jabaquara (Azul)", "tipo": "linha", "km": 1.1, "comum": 2.1, "pico": 2.7, "chuva": 2.3},
    // ---- Linha 11 - Coral: trechos entre estações vizinhas ----
    {"origem": "Luz (Coral)", "destino": "Brás (Coral)", "tipo": "linha", "km": 2.1, "comum": 3.1, "pico": 3.6, "chuva": 3.7},
    {"origem": "Brás (Coral)", "destino": "Tatuapé (Coral)", "tipo": "linha", "km": 3.9, "comum": 5.1, "pico": 5.8, "chuva": 6.0},
    {"origem": "Tatuapé (Coral)", "destino": "Corinthians-Itaquera (Coral)", "tipo": "linha", "km": 10.0, "comum": 12.0, "pico": 13.0, "chuva": 13.8},
    {"origem": "Corinthians-Itaquera (Coral)", "destino": "Dom Bosco (Coral)", "tipo": "linha", "km": 3.1, "comum": 4.2, "pico": 4.8, "chuva": 5.0},
    {"origem": "Dom Bosco (Coral)", "destino": "José Bonifácio (Coral)", "tipo": "linha", "km": 2.0, "comum": 3.0, "pico": 3.5, "chuva": 3.6},
    {"origem": "José Bonifácio (Coral)", "destino": "Guaianases (Coral)", "tipo": "linha", "km": 2.5, "comum": 3.5, "pico": 4.1, "chuva": 4.2},
    {"origem": "Guaianases (Coral)", "destino": "Antônio Gianetti Neto (Coral)", "tipo": "linha", "km": 3.3, "comum": 4.4, "pico": 5.1, "chuva": 5.2},
    {"origem": "Antônio Gianetti Neto (Coral)", "destino": "Ferraz de Vasconcelos (Coral)", "tipo": "linha", "km": 2.2, "comum": 3.2, "pico": 3.7, "chuva": 3.8},
    {"origem": "Ferraz de Vasconcelos (Coral)", "destino": "Poá (Coral)", "tipo": "linha", "km": 3.0, "comum": 4.1, "pico": 4.7, "chuva": 4.9},
    {"origem": "Poá (Coral)", "destino": "Calmon Viana (Coral)", "tipo": "linha", "km": 1.7, "comum": 2.6, "pico": 3.1, "chuva": 3.2},
    {"origem": "Calmon Viana (Coral)", "destino": "Suzano (Coral)", "tipo": "linha", "km": 3.4, "comum": 4.6, "pico": 5.2, "chuva": 5.4},
    {"origem": "Suzano (Coral)", "destino": "Jundiapeba (Coral)", "tipo": "linha", "km": 5.0, "comum": 6.4, "pico": 7.1, "chuva": 7.4},
    {"origem": "Jundiapeba (Coral)", "destino": "Braz Cubas (Coral)", "tipo": "linha", "km": 3.6, "comum": 4.8, "pico": 5.4, "chuva": 5.6},
    {"origem": "Braz Cubas (Coral)", "destino": "Mogi das Cruzes (Coral)", "tipo": "linha", "km": 2.9, "comum": 4.0, "pico": 4.6, "chuva": 4.7},
    {"origem": "Mogi das Cruzes (Coral)", "destino": "Estudantes (Coral)", "tipo": "linha", "km": 1.8, "comum": 2.7, "pico": 3.3, "chuva": 3.3},
    // ---- Baldeações (mesma estação, linhas diferentes) ----
    {"origem": "Palmeiras-Barra Funda (Turquesa)", "destino": "Palmeiras-Barra Funda (Vermelha)", "tipo": "transferencia", "km": 0.0, "comum": 4.0, "pico": 6.0, "chuva": 7.0},
    {"origem": "Luz (Turquesa)", "destino": "Luz (Azul)", "tipo": "transferencia", "km": 0.0, "comum": 5.0, "pico": 8.0, "chuva": 9.0},
    {"origem": "Luz (Turquesa)", "destino": "Luz (Coral)", "tipo": "transferencia", "km": 0.0, "comum": 4.0, "pico": 6.0, "chuva": 7.0},
    {"origem": "Brás (Turquesa)", "destino": "Brás (Vermelha)", "tipo": "transferencia", "km": 0.0, "comum": 5.0, "pico": 8.0, "chuva": 9.0},
    {"origem": "Brás (Turquesa)", "destino": "Brás (Coral)", "tipo": "transferencia", "km": 0.0, "comum": 4.5, "pico": 7.0, "chuva": 8.0},
    {"origem": "Sé (Vermelha)", "destino": "Sé (Azul)", "tipo": "transferencia", "km": 0.0, "comum": 3.0, "pico": 6.0, "chuva": 7.0},
    {"origem": "Brás (Vermelha)", "destino": "Brás (Coral)", "tipo": "transferencia", "km": 0.0, "comum": 4.5, "pico": 7.0, "chuva": 8.0},
    {"origem": "Santa Cruz (Lilás)", "destino": "Santa Cruz (Azul)", "tipo": "transferencia", "km": 0.0, "comum": 4.0, "pico": 6.0, "chuva": 7.0},
    {"origem": "Luz (Azul)", "destino": "Luz (Coral)", "tipo": "transferencia", "km": 0.0, "comum": 4.5, "pico": 7.0, "chuva": 8.0},
    {"origem": "Tatuapé (Coral)", "destino": "Tatuapé (Vermelha)", "tipo": "transferencia", "km": 0.0, "comum": 4.0, "pico": 7.0, "chuva": 8.0},
    {"origem": "Corinthians-Itaquera (Coral)", "destino": "Corinthians-Itaquera (Vermelha)", "tipo": "transferencia", "km": 0.0, "comum": 4.0, "pico": 7.0, "chuva": 8.0}
  ]
};


/* =====================================================================
   PARTE 2 — LÓGICA: do JSON ao caminho mínimo
   =====================================================================

   FLUXO GERAL

     A página abre  -->  iniciar()
                           |- construirGrafo(MEU_JSON)   JSON vira "lista de adjacências"
                           '- popularSelects(MEU_JSON)   preenche as listas Origem/Destino

     O usuário clica em Calcular  -->  calcularERexibir()
                           |- dijkstra(origem, destino, criterio)   <- o algoritmo em si
                           '- escreve o resultado na página
   ===================================================================== */

// Critérios de custo que o usuário pode escolher.
// A CHAVE ("km", "comum", "pico", "chuva") é o mesmo nome do campo dentro de
// "pesos" em cada aresta. "nome" e "unidade" só servem para escrever o
// resultado na tela.
const CRITERIOS = {
  km:    { nome: 'Menor distância',               unidade: 'km'  },
  comum: { nome: 'Menor tempo (dia normal)',      unidade: 'min' },
  pico:  { nome: 'Menor tempo (horário de pico)', unidade: 'min' },
  chuva: { nome: 'Menor tempo (dia de chuva)',    unidade: 'min' }
};

// O grafo montado (lista de adjacências). Começa vazio e é preenchido por
// iniciar(). O Dijkstra só LÊ este objeto, nunca o modifica.
let grafo = {};


// ---------------------------------------------------------------------
// 1) construirGrafo — transforma o JSON em uma LISTA DE ADJACÊNCIAS
// ---------------------------------------------------------------------
// PARA QUE SERVE:
//   O JSON é bom para guardar os dados, mas o Dijkstra precisa responder
//   rápido a esta pergunta: "estou no nó X; para quais nós posso ir daqui
//   e quanto custa cada um?". A lista de adjacências responde isso: é um
//   objeto em que a CHAVE é o nó e o VALOR é a lista dos seus vizinhos.
//
// COMO FICA O RESULTADO (exemplo reduzido):
//   {
//     "Luz (Azul)": [
//       { no: "Tiradentes (Azul)", tipo: "linha",
//         pesos: { km: 0.9, comum: 1.8, pico: 2.4, chuva: 2.0 } },
//       { no: "Luz (Coral)", tipo: "transferencia",
//         pesos: { km: 0.0, comum: 4.5, pico: 7.0, chuva: 8.0 } },
//       ...
//     ],
//     "Tiradentes (Azul)": [ ... ],
//     ...
//   }
function construirGrafo(dados) {
  // "g" é o grafo que vamos montar e devolver no final.
  const g = {};

  // Proteção: se o JSON estiver incompleto, devolve um grafo vazio
  // em vez de quebrar mais adiante.
  if (!dados.nos || !dados.arestas) return g;

  // PASSO 1 — cria uma entrada (lista de vizinhos vazia) para cada nó.
  // Fazer isso ANTES de olhar as arestas garante que todo nó exista no
  // grafo, mesmo que ainda não tenha nenhuma ligação.
  dados.nos.forEach(no => {
    g[no.id] = [];
  });

  // PASSO 2 — percorre as arestas e registra cada uma nas listas dos
  // DOIS nós que ela liga.
  dados.arestas.forEach(aresta => {
    // Desestruturação: tira de dentro do objeto "aresta" só os campos
    // que vamos usar, cada um em uma variável com o mesmo nome.
    const { origem, destino, tipo, km, comum, pico, chuva } = aresta;

    // Se algum dos dois nós não existir em "nos" (por exemplo, erro de
    // digitação no JSON), avisa no console e pula esta aresta.
    // (dentro de um forEach, "return" pula para a próxima aresta)
    if (!g[origem] || !g[destino]) {
      console.warn('Aresta ignorada (nó não existe em "nos"):', origem, '->', destino);
      return;
    }

    // Junta os 4 custos em um único objeto. É isto que permite escolher
    // o critério depois: pesos["km"], pesos["pico"], etc.
    const pesos = { km: km, comum: comum, pico: pico, chuva: chuva };

    // O metrô é um grafo NÃO DIRECIONADO: se dá para ir de A até B, dá
    // para ir de B até A pelo mesmo custo. Por isso a mesma aresta é
    // registrada duas vezes, uma em cada sentido.
    g[origem].push({ no: destino, tipo: tipo, pesos: pesos });
    g[destino].push({ no: origem, tipo: tipo, pesos: pesos });
  });

  return g;
}


// ---------------------------------------------------------------------
// 2) popularSelects — preenche as listas "Origem" e "Destino" da página
// ---------------------------------------------------------------------
// PARA QUE SERVE:
//   O usuário escolhe as estações em uma lista em vez de digitar, o que
//   evita erro de digitação. Cada <option> guarda o id de um nó.
function popularSelects(dados) {
  const selectOrigem = document.getElementById('origem');
  const selectDestino = document.getElementById('destino');

  // Limpa as listas e deixa só a opção "vazia" inicial.
  selectOrigem.innerHTML = '<option value="">Selecione a origem</option>';
  selectDestino.innerHTML = '<option value="">Selecione o destino</option>';

  if (!dados.nos) return;

  // [...dados.nos] cria uma CÓPIA do array. O sort() altera o array em que
  // é chamado, e não queremos mexer na ordem original do JSON.
  // localeCompare compara textos respeitando acentos e a ordem alfabética.
  const nosOrdenados = [...dados.nos].sort((a, b) => a.id.localeCompare(b.id));

  nosOrdenados.forEach(no => {
    // Cria um <option> para a lista de origem...
    const opt1 = document.createElement('option');
    opt1.value = no.id;          // valor que o código lê depois
    opt1.textContent = no.id;    // texto que o usuário enxerga
    selectOrigem.appendChild(opt1);

    // ...e outro para a de destino (um mesmo elemento não pode estar
    // em dois lugares ao mesmo tempo, por isso criamos um segundo).
    const opt2 = document.createElement('option');
    opt2.value = no.id;
    opt2.textContent = no.id;
    selectDestino.appendChild(opt2);
  });
}


// ---------------------------------------------------------------------
// 3) dijkstra — o algoritmo de caminho mínimo
// ---------------------------------------------------------------------
// PARA QUE SERVE:
//   Dados um nó de origem e um de destino, encontra o caminho de MENOR
//   CUSTO TOTAL, isto é, a menor soma dos custos das arestas percorridas.
//   "Custo" é o critério escolhido: km, tempo normal, tempo de pico ou
//   tempo com chuva.
//
// A IDEIA EM PALAVRAS:
//   Imagine uma gota d'água caindo na origem e se espalhando pelo mapa:
//   ela chega primeiro nos nós mais próximos, depois nos um pouco mais
//   longe, e assim por diante. O Dijkstra imita isso. A cada rodada ele
//   "fecha" o nó ainda aberto que está MAIS PERTO da origem (a distância
//   dele já é a definitiva) e usa esse nó para tentar melhorar a
//   distância dos vizinhos dele.
//
// POR QUE FUNCIONA:
//   Nenhum custo é negativo. Então, quando escolhemos o nó aberto mais
//   próximo, nenhum desvio passando por outros nós abertos (todos mais
//   longe) conseguiria chegar nele por menos. Por isso o valor dele já é
//   o melhor possível. Com custos negativos esse raciocínio quebra, e é
//   por isso que o Dijkstra não aceita pesos negativos.
//
// PARÂMETROS:
//   origem, destino -> ids dos nós (ex.: "Luz (Azul)")
//   criterio        -> qual custo da aresta usar: "km", "comum", "pico" ou
//                      "chuva". Se não for informado, usa "km" (valor padrão).
//
// RETORNO:  { distanciaTotal, caminho }
//   distanciaTotal -> soma dos custos do melhor caminho (Infinity se não
//                     existir caminho)
//   caminho        -> lista de passos, da origem ao destino. Cada passo é
//                     { no, pesoTrecho, tipo }:
//                       no         = id do nó
//                       pesoTrecho = custo do trecho que levou ATÉ esse nó
//                       tipo       = "linha" ou "transferencia"
//
// COMPLEXIDADE:
//   Esta versão procura o nó mais próximo varrendo todos os abertos, então
//   faz V rodadas de custo V: O(V²), com V = número de nós (aqui, 89).
//   Para grafos enormes se usa uma fila de prioridade (heap), que reduz
//   para O((V + E) log V). Para este mapa a diferença é imperceptível.
function dijkstra(origem, destino, criterio = 'km') {

  // PASSO 0 — Confere se o critério existe. Sem isso, um nome errado
  // faria o código somar "undefined" e dar resultados sem sentido.
  if (!CRITERIOS[criterio]) {
    throw new Error('Critério inválido: ' + criterio + ' (use km, comum, pico ou chuva)');
  }

  // PASSO 1 — Estruturas de controle.
  // As três primeiras são "dicionários": a chave é o id do nó.
  const distancias = {};      // distancias[no]     = menor custo conhecido da origem até "no" (por enquanto)
  const anteriores = {};      // anteriores[no]     = nó imediatamente ANTES de "no" no melhor caminho conhecido
  const detalhesAresta = {};  // detalhesAresta[no] = aresta usada para chegar em "no" (guarda tipo e pesos)

  // Set é um conjunto sem repetições. Aqui guarda os nós ainda ABERTOS,
  // ou seja, aqueles cuja distância ainda não é definitiva.
  const nosNaoVisitados = new Set();

  // PASSO 2 — Estado inicial: ninguém foi alcançado ainda.
  Object.keys(grafo).forEach(no => {
    distancias[no] = Infinity;   // custo "infinito" = ainda não sabemos chegar lá
    anteriores[no] = null;       // ainda não sabemos de onde se chega
    detalhesAresta[no] = null;
    nosNaoVisitados.add(no);     // todos começam abertos
  });

  // O custo de ir da origem até ela mesma é zero. É daqui que o
  // algoritmo parte: a origem é o único nó com distância diferente de Infinity.
  distancias[origem] = 0;

  // PASSO 3 — Laço principal: repete enquanto ainda houver nós abertos.
  while (nosNaoVisitados.size > 0) {

    // 3.1 — ESCOLHER o nó aberto com a MENOR distância até agora.
    // Começamos sem candidato (null) e comparamos um a um: se o nó da vez
    // tem distância menor que a do candidato, ele vira o novo candidato.
    let noAtual = null;
    nosNaoVisitados.forEach(no => {
      if (noAtual === null || distancias[no] < distancias[noAtual]) {
        noAtual = no;
      }
    });

    // 3.2 — PARAR se o melhor nó aberto ainda está em Infinity: significa
    // que nenhum dos nós que sobraram pode ser alcançado a partir da origem.
    if (noAtual === null || distancias[noAtual] === Infinity) {
      break;
    }

    // 3.3 — PARAR se o nó escolhido é o destino. Como ele é o aberto mais
    // próximo, a distância dele já é a definitiva; não precisa calcular o
    // resto do mapa.
    if (noAtual === destino) {
      break;
    }

    // 3.4 — FECHAR o nó: a partir daqui ele deixa de ser candidato.
    nosNaoVisitados.delete(noAtual);

    // 3.5 — RELAXAMENTO: usa o nó recém-fechado para tentar melhorar a
    // distância dos vizinhos dele. grafo[noAtual] é a lista de vizinhos.
    grafo[noAtual].forEach(vizinho => {

      // Só interessa vizinho ainda aberto: os fechados já têm distância
      // definitiva e não podem melhorar.
      if (nosNaoVisitados.has(vizinho.no)) {

        // Custo desta aresta no critério escolhido. Colchetes com variável:
        // se criterio = "pico", isto vira vizinho.pesos["pico"].
        const pesoAresta = vizinho.pesos[criterio];

        // Custo de chegar ao vizinho PASSANDO por noAtual:
        // (custo até noAtual) + (custo da aresta noAtual -> vizinho).
        const novaDist = distancias[noAtual] + pesoAresta;

        // Se esse caminho é melhor que o melhor conhecido até agora, atualiza.
        // Exemplo: estamos fechando "Luz (Azul)" com distância 10 e o vizinho
        // "São Bento (Azul)" está em Infinity. novaDist = 10 + 0.8 = 10.8, que é
        // menor que Infinity, então atualizamos. Mais tarde outro nó pode oferecer
        // um caminho ainda melhor até "São Bento (Azul)", e atualizamos de novo.
        if (novaDist < distancias[vizinho.no]) {
          distancias[vizinho.no] = novaDist;       // nova melhor distância
          anteriores[vizinho.no] = noAtual;        // para chegar nele, venha de noAtual
          detalhesAresta[vizinho.no] = vizinho;    // e por esta aresta (tipo e pesos)
        }
      }
    });
  }

  // PASSO 4 — RECONSTRUIR o caminho.
  // O laço acima só guardou, para cada nó, "de quem eu vim" (anteriores).
  // Para montar a rota, começamos no DESTINO e vamos voltando pelos
  // "anteriores" até chegar em null (o "anterior" da origem).
  // Como andamos do fim para o começo, usamos unshift(), que insere no
  // INÍCIO do array, e assim o caminho fica na ordem origem -> destino.
  const caminho = [];
  let atual = destino;

  while (atual !== null) {
    caminho.unshift({
      no: atual,
      // custo do trecho que levou até este nó (a origem não tem trecho: 0)
      pesoTrecho: detalhesAresta[atual] ? detalhesAresta[atual].pesos[criterio] : 0,
      // tipo do trecho: "linha" ou "transferencia" (a origem não tem: null)
      tipo: detalhesAresta[atual] ? detalhesAresta[atual].tipo : null
    });
    atual = anteriores[atual];   // anda um passo para trás
  }

  // PASSO 5 — Devolve o resultado. Se o destino nunca foi alcançado,
  // distancias[destino] continua Infinity e quem chamou trata esse caso.
  return {
    distanciaTotal: distancias[destino],
    caminho: caminho
  };
}


// ---------------------------------------------------------------------
// 4) formatar — número no padrão brasileiro (só para exibir)
// ---------------------------------------------------------------------
// Ex.: 12.6 vira "12,6". Só arredondamos aqui, na hora de MOSTRAR. Durante
// o cálculo mantemos os números completos, porque somar decimais em
// JavaScript gera pequenos erros (0.1 + 0.2 = 0.30000000000000004).
function formatar(valor) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}


// ---------------------------------------------------------------------
// 5) calcularERexibir — liga a TELA ao ALGORITMO
// ---------------------------------------------------------------------
// PARA QUE SERVE:
//   É a função chamada pelo botão. Ela só faz a ponte: lê o que o usuário
//   escolheu, chama o dijkstra() e escreve o resultado na página.
//   Nenhuma regra do algoritmo fica aqui.
function calcularERexibir() {
  // 1) LER as escolhas do usuário.
  const origem = document.getElementById('origem').value;
  const destino = document.getElementById('destino').value;

  // O seletor de critério é opcional no HTML. Se não existir na página,
  // usamos "km" (o comportamento do código original).
  const seletorCriterio = document.getElementById('criterio');
  const criterio = seletorCriterio ? seletorCriterio.value : 'km';

  // Elementos da página onde o resultado vai aparecer.
  const divResultado = document.getElementById('resultado');
  const divResumo = document.getElementById('resumo');
  const ulPassos = document.getElementById('passos');

  // 2) VALIDAR antes de calcular. "return" encerra a função aqui.
  if (!origem || !destino) {
    alert('Por favor, selecione uma estação de origem e uma de destino.');
    return;
  }

  if (origem === destino) {
    alert('Origem e destino são iguais!');
    return;
  }

  // 3) CALCULAR.
  const resultado = dijkstra(origem, destino, criterio);

  // 4) Se o destino nunca foi alcançado, a distância continua Infinity.
  if (resultado.distanciaTotal === Infinity) {
    divResumo.innerHTML = 'Não foi possível encontrar um caminho entre as estações selecionadas.';
    ulPassos.innerHTML = '';
    divResultado.style.display = 'block';
    return;
  }

  // 5) MOSTRAR o resultado.
  const { nome, unidade } = CRITERIOS[criterio];   // ex.: nome = "Menor distância", unidade = "km"

  // filter() devolve só os passos que são baldeação; length conta quantos são.
  const totalBaldeacoes = resultado.caminho.filter(passo => passo.tipo === 'transferencia').length;

  divResumo.innerHTML =
    '<strong>' + nome + ':</strong> ' + formatar(resultado.distanciaTotal) + ' ' + unidade +
    ' (' + totalBaldeacoes + ' baldeação(ões))';

  // Limpa a lista anterior e cria um <li> por passo do caminho.
  ulPassos.innerHTML = '';
  resultado.caminho.forEach((passo, indice) => {
    const li = document.createElement('li');

    if (indice === 0) {
      li.textContent = passo.no + ' (partida)';
    } else if (passo.tipo === 'transferencia') {
      li.textContent = passo.no + ' - baldeação (+' + formatar(passo.pesoTrecho) + ' ' + unidade + ')';
    } else {
      li.textContent = passo.no + ' (+' + formatar(passo.pesoTrecho) + ' ' + unidade + ')';
    }

    ulPassos.appendChild(li);
  });

  // Torna visível a área de resultado (provavelmente começa escondida no HTML).
  divResultado.style.display = 'block';
}


/* =====================================================================
   PARTE 3 — INICIALIZAÇÃO
   =====================================================================
   Monta o grafo UMA vez (o Dijkstra só lê o grafo, não altera) e preenche
   as listas da tela. Se a sua página já faz isso em outro lugar, pode
   apagar este bloco.
   ===================================================================== */
function iniciar() {
  grafo = construirGrafo(MEU_JSON);
  popularSelects(MEU_JSON);
}

// Se a página ainda está carregando, espera terminar para os <select>
// existirem; se já terminou, roda direto.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
