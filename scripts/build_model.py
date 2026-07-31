# -*- coding: utf-8 -*-
"""
Generador maestro de CompraSanJose.

- Contiene TODO el modelo (fuente unica de verdad).
- Escribe los CSV en data/ (versionados en git).
- Construye data/CompraSanJose.xlsx con una pestana por tabla
  (Drive lo convierte en un unico Google Sheet con todas las hojas).

Ejecuta:  python scripts/build_model.py

Cantidades POR COMENSAL (racion adulta), unidad base: g / ml / ud.
Nino = FactorNino raciones (0,5) salvo en la barbacoa (gramos por categoria).
Los ingredientes marcados EsStaple=Si NO se escalan por racion: son de
"compra unica" y viven en la hoja Staples (aceite, especias, ajos, etc.).
"""
import csv, os, math
from datetime import date

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, "data")
os.makedirs(DATA, exist_ok=True)

# ---------------------------------------------------------------- CONFIG
CONFIG = [
    ("AdultosM", "7",   "Adultos hombres"),
    ("AdultosF", "7",   "Adultos mujeres"),
    ("Ninos",    "3",   "Ninos"),
    ("FactorNino","0.5","Racion equivalente de un nino (platos generales)"),
    ("BBQ_g_M",  "300", "Gramos de carne de barbacoa por adulto masculino (estandar)"),
    ("BBQ_g_F",  "200", "Gramos de carne de barbacoa por adulta femenina (estandar)"),
    ("BBQ_g_Nino","100","Gramos de carne de barbacoa por nino"),
    ("BBQ_g_M_red","200","Carne BBQ por hombre en modo reducido (con mazorcas)"),
    ("BBQ_g_F_red","150","Carne BBQ por mujer en modo reducido (con mazorcas)"),
    ("DiasDesayuno","8","Numero de desayunos del evento"),
    ("DiasEvento","9","Dias del evento (1-9 agosto)"),
]

# ---------------------------------------------------------------- COMIDAS
# (Comida, MomentoSugerido, Cocinero, Preparacion, Notas)
COMIDAS = [
 ("Arroz campero","Almuerzo","Luis",
  "1. Sofrie cebolla, pimientos y ajo en aceite.\n2. Dora el pollo troceado y el chorizo.\n3. Anade tomate natural y pimenton; rehoga.\n4. Incorpora el arroz y el caldo caliente (doble volumen).\n5. Anade guisantes; cuece 18 min y reposa 5 min.",
  ""),
 ("Mousaka griega","Almuerzo","Paco",
  "1. Lamina berenjena y patata; frie o asa.\n2. Sofrie cebolla y ajo; anade la ternera picada.\n3. Agrega tomate tamizado, vino y canela; reduce.\n4. Monta capas: patata, berenjena, carne.\n5. Cubre con bechamel (mantequilla, harina, leche, huevo, queso) y hornea 35 min a 190C.",
  "Con ternera (no cordero); tomate tamizado."),
 ("Couscous","Almuerzo","Paco",
  "1. Sofrie cebolla, zanahoria (opcional), calabacin y pimiento.\n2. Anade el pollo y el ras el hanout.\n3. Incorpora tomate tamizado, garbanzos, pasas y caldo; guisa.\n4. Hidrata la semola con caldo caliente y aceite; desgrana.\n5. Sirve el guiso sobre el couscous.",
  "Zanahoria opcional; tomate tamizado (poco)."),
 ("Plato alpujarreno con huevos","Almuerzo","Paco",
  "1. Frie las patatas en laminas a fuego medio hasta tiernas.\n2. Frie morcilla, chorizo, longaniza y lomo.\n3. Anade el jamon al final.\n4. Frie los huevos.\n5. Sirve todo junto con pimiento frito.",
  "Patatas a lo pobre + embutido + huevos."),
 ("Salmorejo con acompanamiento","Almuerzo","Paco",
  "1. Tritura tomate, pan remojado, ajo y sal.\n2. Emulsiona anadiendo el AOVE en hilo.\n3. Ajusta con un poco de vinagre; enfria.\n4. Sirve con huevo duro y jamon picados.\n5. Acompana con los filetes a la plancha (o la opcion elegida).",
  "Acompanamiento elegible; por defecto filetes de ternera."),
 ("Migas","Almuerzo","Manolo",
  "1. Humedece el pan troceado la noche antes.\n2. Frie ajos, chorizo y panceta; reserva.\n3. En esa grasa anade el pan y el pimenton.\n4. Remueve a fuego medio hasta que quede suelto y dorado.\n5. Sirve con los tropezones.",
  ""),
 ("Chili con carne","Almuerzo","Dan",
  "1. Sofrie cebolla, pimiento y ajo.\n2. Dora la carne picada.\n3. Anade comino, pimenton picante, tomate y caldo; guisa 30 min.\n4. Incorpora alubias y la lata de maiz; cuece 10 min.\n5. Sirve con arroz blanco.",
  "Con guarnicion de arroz."),
 ("Asado de pollo y patatas","Almuerzo","Paco",
  "1. Trocea el pollo y salpimienta.\n2. Coloca con patata y cebolla en bandeja.\n3. Riega con vino, aceite, limon y romero.\n4. Hornea 60-75 min a 200C regando de vez en cuando.",
  "El 'asado de carne/pescado'."),
 ("Pisto de verduras con huevos","Almuerzo","Paco",
  "1. Pocha la cebolla y el pimiento verde en aceite.\n2. Anade el tomate frito; cuece 20 min a fuego lento.\n3. Sazona.\n4. Frie los huevos y sirvelos encima.",
  "RESPALDO: solo cebolla, tomate frito y pimiento verde + huevos."),
 ("Barbacoa 1","Cena","Manolo",
  "1. Enciende las brasas con antelacion.\n2. Sala las carnes justo antes de asar.\n3. Asa primero lo que mas tarda (costillas).\n4. Anade embutidos y mazorcas.\n5. Sirve con pan y salsas.",
  "Cerdo y embutido. Tope de carne por comensal (RF-26)."),
 ("Barbacoa 2","Cena","Manolo",
  "1. Enciende las brasas con antelacion.\n2. Sala las carnes justo antes de asar.\n3. Asa primero el entrecot y las alitas.\n4. Anade la verdura y las mazorcas.\n5. Sirve con pan y chimichurri.",
  "Vacuno, pollo y verdura. Tope de carne por comensal (RF-26)."),
 ("Fajitas","Cena","Manolo",
  "1. Marca el pollo en tiras con las especias.\n2. Saltea con pimientos y cebolla.\n3. Calienta las tortillas.\n4. Monta con queso, guacamole, nata agria, tomate y lechuga.",
  ""),
 ("Hamburguesas","Cena","",
  "1. Forma las hamburguesas y salpimienta.\n2. Marca a la plancha al punto deseado.\n3. Tuesta el pan; funde el queso sobre la carne.\n4. Frie el bacon.\n5. Monta con lechuga, tomate, cebolla, pepinillos y salsas. Acompana con patatas.",
  ""),
 ("Pizzas","Cena","",
  "1. Estira la masa.\n2. Extiende el tomate.\n3. Reparte mozzarella y los ingredientes.\n4. Hornea a maxima temperatura 8-12 min.\n5. Oregano y aceite al salir.",
  ""),
 ("Fritura de pescado","Cena","Paco",
  "1. Adoba el cazon (vinagre, pimenton, comino, ajo, oregano) unas horas.\n2. Limpia y trocea los pescados.\n3. Enharina con harina de freir/tempura.\n4. Frie en abundante aceite caliente por tandas.\n5. Sirve con limon.",
  "Surtido elegible; incluye adobo y tempura."),
 ("Paella de marisco","Almuerzo","Paco",
  "1. Sofrie cebolla, pimiento y ajo en aceite; anade tomate natural.\n2. Rehoga el arroz con pimenton y azafran.\n3. Anade el caldo de pescado caliente (doble volumen) y los guisantes.\n4. Incorpora el calamar; a media coccion anade gambas, mejillones y almejas.\n5. Cuece 18 min sin remover; reposa 5 min. Sirve con limon.",
  "Opcion alternativa de arroz."),
]

# Preparacion (de recetarios reales) y fuente, adaptada a nuestros ingredientes.
PREP = {
 "Arroz campero":(
  "1. Pica pimiento verde, ajos y tomate. En la paellera, sofrie pimiento y ajos; anade la aguja de vaca troceada y el chorizo salpimentados y dora.\n2. Incorpora el tomate natural y rehoga.\n3. Anade el arroz (90-100 g/persona) y sofrielo 2 min con pimenton y colorante o azafran.\n4. Vierte el caldo caliente (3 veces el volumen de arroz) y cuece a fuego fuerte 8 min.\n5. Anade guisantes y el pimiento morron asado; baja a fuego minimo y cuece 8 min mas.\n6. Apaga, tapa con un pano y reposa 7-8 min.",
  "https://www.directoalpaladar.com/recetas-de-arroces/receta-arroz-campero-tipico-andalucia"),
 "Mousaka griega":(
  "1. Lamina las berenjenas, salalas y dejalas sudar; frielas ligeramente y reserva.\n2. Corta las patatas en rodajas y frielas ligeramente para la base.\n3. Pocha cebolla, anade tomate tamizado (nunca concentrado ni frito) y haz el sofrito.\n4. Incorpora la ternera picada dorada, un chorro de vino tinto y caldo; cuece 10 min hasta que no quede liquido.\n5. Prepara la bechamel (25 g mantequilla, 25 g harina, 500 ml leche) hasta que espese.\n6. Monta por capas: patata, berenjena, carne, berenjena; cubre con bechamel y queso.\n7. Hornea 20 min a 160C y gratina 3 min a 220C.",
  "https://www.directoalpaladar.com/recetas-de-carnes-y-aves/moussaka-receta-griega"),
 "Couscous":(
  "1. Trocea la carrillera de ternera, salpimienta y dorala a fuego alto en la cazuela.\n2. Baja el fuego, anade cebolla y pocha 10 min.\n3. Incorpora muy poco tomate tamizado y cocina hasta evaporar.\n4. Anade caldo, la zanahoria en dados (opcional), jengibre, comino y curcuma; guisa a fuego lento hasta que la carne este muy tierna.\n5. Anade el calabacin y los garbanzos; cuece 10-15 min mas.\n6. Aparte, hidrata la semola con caldo hirviendo, tapa 5 min y desgrana con un tenedor.\n7. Sirve la semola de base y reparte el guiso por encima.",
  "https://www.todosacomer.net/recetas/guisos-pasta-arroces/cuscus-con-verduras-y-pollo"),
 "Plato alpujarreno con huevos":(
  "1. Corta las patatas en rodajas de 1/2 cm; pica ajo y corta cebolla y pimiento verde.\n2. En abundante aceite, frie ajo y luego patatas, cebolla y pimiento; 5 min a fuego fuerte.\n3. Baja el fuego y cocina 25 min removiendo hasta que las patatas a lo pobre esten tiernas; escurre y sala.\n4. Aparte, frie los embutidos (chorizo, morcilla, longaniza, lomo) 5 min; escurre.\n5. Frie los huevos en aceite muy caliente para que la puntilla quede crujiente.\n6. Emplata: base de patatas, encima embutidos, huevos fritos y unas lonchas de jamon.",
  "https://bonviveur.com/es/recetas/plato-alpujarreno"),
 "Salmorejo con acompanamiento":(
  "1. Tritura los tomates (1 kg por cada 6 raciones); no hace falta pelar ni despepitar.\n2. Anade el pan (unos 200 g de telera por cada 6) y deja que se empape 10 min.\n3. Anade el ajo y tritura hasta una crema espesa.\n4. Incorpora el AOVE en hilo y bate hasta emulsionar; sala y enfria.\n5. Sirve frio con jamon picado y huevo cocido.\n6. De acompanamiento, salpimienta los filetes y hazlos a la plancha 2-3 min por cara.",
  "https://www.directoalpaladar.com/recetas-de-sopas-y-cremas/receta-de-salmorejo-cordobes-tradicional"),
 "Migas":(
  "1. Corta pan candeal asentado en cubos de 1 cm; humedecelo con agua salada, tapa con un pano y reposa (mejor de un dia para otro).\n2. Frie el chorizo en rodajas y la panceta en dados hasta que suelten grasa; reserva.\n3. En esa grasa, rehoga los ajos aplastados con piel 2-3 min sin quemar.\n4. Anade las migas de pan y el pimenton; cocina a fuego suave 10 min removiendo.\n5. Cuando esten sueltas y doradas, devuelve chorizo y panceta y mezcla.\n6. Para grupo grande, trabaja por tandas o en perol amplio; sirve muy caliente.",
  "https://www.directoalpaladar.com/recetas-tradicionales/mejor-receta-migas-pan-chorizo-clasico-potente-como-tradicional"),
 "Chili con carne":(
  "1. Pocha la cebolla en aceite hasta transparente.\n2. Anade ajo, pimenton picante y comino; rehoga.\n3. Incorpora la carne picada y cocina hasta que pierda el color.\n4. Anade tomate, un poco de caldo y una pizca de azucar; cuece destapado 30 min.\n5. Anade las alubias rojas y la lata de maiz; cuece unos minutos.\n6. Rectifica de sal y picante; sirve con arroz blanco y nachos.",
  "https://www.directoalpaladar.com/recetas-de-carnes-y-aves/chili-receta-mexicana-con-y-sin-thermomix"),
 "Asado de pollo y patatas":(
  "1. Precalienta el horno a 180C. Mezcla sal, pimienta y tomillo/romero.\n2. Parte las patatas, hazles cortes y colocalas en la bandeja engrasada.\n3. Sazona el pollo por dentro y fuera; introduce ajos en cortes y en la cavidad.\n4. Coloca el pollo sobre las patatas y hornea a 180C unos 45-60 min (remueve las patatas a media coccion).\n5. Pasa los jugos a un cazo, hierve y liga con un poco de maicena.\n6. Trincha, riega con la salsa y sirve; para mas comensales reparte en varias bandejas sin amontonar.",
  "https://www.hogarmania.com/cocina/recetas/carnes/pollo-asado-patatas-ensalada-verde-16651.html"),
 "Pisto de verduras con huevos":(
  "1. Pica en cuadraditos la cebolla y el pimiento verde; pica una pizca de ajo.\n2. Pocha cebolla, pimiento y ajo en aceite 10-15 min a fuego medio.\n3. Anade el tomate natural y cuece despacio hasta que quede meloso (no caldoso).\n4. Rectifica de sal (pizca de azucar si esta acido).\n5. Aparte, frie los huevos.\n6. Sirve el pisto con los huevos fritos por encima.",
  "https://www.directoalpaladar.com/recetas-de-legumbres-y-verduras/pisto-de-pimientos-y-tomates-la-receta-de-mi-abuela"),
 "Barbacoa 1":(
  "1. Enciende la barbacoa 30-40 min antes; espera a que las brasas esten blanquecinas, sin llama.\n2. Reparte el carbon para calor uniforme; parrilla no muy pegada a las brasas.\n3. Empieza por el embutido y las piezas grasas: chorizo, panceta y morcilla.\n4. Asa la presa, el secreto y la pluma de cerdo a calor medio, girando cada pocos minutos.\n5. Haz los pinchitos dandoles vueltas para que se doren sin secarse.\n6. Usa carne fresca (sin congelar); retira cada pieza segun se dora.\n7. NO sales antes: echa la sal SOLO AL FINAL, en el plato.",
  "https://www.directoalpaladar.com/cultura-gastronomica/los-9-trucos-imprescindibles-para-convertirte-en-el-maestro-de-las-barbacoas"),
 "Barbacoa 2":(
  "1. Enciende las brasas 30-40 min antes; saca el vacuno de la nevera para atemperar.\n2. Sella el entrecot y el chuleton sobre brasa fuerte ~5 min por cara; una sola vuelta.\n3. Asa las chuletas de cordero hasta que esten doradas y jugosas.\n4. Haz la chistorra y el chorizo cerca del borde para que no revienten.\n5. Deja reposar el vacuno 5 min antes de trocear; acompana con chimichurri.\n6. Asa las verduras (calabacin, cebolleta, pimiento) y las mazorcas untadas de aceite, 5-10 min por lado.\n7. Echa la sal AL FINAL para no resecar la carne.",
  "https://www.directoalpaladar.com/recetario/83-mejores-recetas-barbacoa-para-sacar-todo-partido-a-parrilla-este-verano"),
 "Fajitas":(
  "1. Corta el pollo en tiras y la cebolla y los pimientos en tiras anchas.\n2. Salpimienta el pollo y saltealo en aceite muy caliente; reserva.\n3. Saltea los pimientos y la cebolla hasta tiernos pero firmes.\n4. Devuelve el pollo, anade especias fajita (comino, pimenton) y un chorrito de lima.\n5. Calienta las tortillas en sarten seca por ambas caras.\n6. Rellena y enrolla; sirve con guacamole, nata agria, queso, tomate y lechuga.",
  "https://www.divinacocina.es/fajitas-de-pollo-faciles/"),
 "Hamburguesas":(
  "1. Usa carne picada fresca; salpimienta.\n2. Mezcla sin amasar en exceso y forma discos regulares.\n3. Deja reposar 10 min a temperatura ambiente.\n4. Plancha o parrilla a fuego medio-fuerte; coloca la hamburguesa untada de aceite.\n5. 2-3 min sin moverla; da la vuelta una vez y pon el queso encima; 2-4 min segun punto.\n6. Tuesta el pan por dentro.\n7. Monta: pan, lechuga y tomate, hamburguesa, bacon, cebolla y pepinillos, salsa y cierra. Acompana con patatas.",
  "https://www.directoalpaladar.com/recetas-de-carnes-y-aves/como-hacer-hamburguesas-caseras"),
 "Pizzas":(
  "1. Mezcla la masa (harina, agua, levadura, sal, aceite) hasta homogenea; reposa 1-3 h.\n2. Divide, bolea y deja reposar; sacala 1-2 h antes si estaba en frio.\n3. Estira cada bola del centro a los bordes dejando el borde mas grueso.\n4. Precalienta el horno 45 min a la maxima temperatura (250C+).\n5. Extiende una capa fina de tomate, la mozzarella y los ingredientes sin sobrecargar.\n6. Hornea 3-4 min abajo y 3-4 min arriba, vigilando.\n7. Reposa unos minutos; anade oregano y aceite al salir.",
  "https://www.directoalpaladar.com/recetas-de-panes/pizza-casera-la-guia-definitiva"),
 "Fritura de pescado":(
  "1. Adobo del cazon: maja ajo, comino, oregano y pimenton, anade vinagre, laurel y sal.\n2. Corta el cazon en tacos, cubrelo con el adobo y macera en nevera 8 h (mejor toda la noche).\n3. Limpia y seca boquerones, calamar en anillas, rosada y el cazon escurrido.\n4. Enharina con harina de freir/tempura y sacude el exceso.\n5. Calienta abundante aceite a 180C sin que humee.\n6. Frie en tandas pequenas 30 s-2 min segun el pescado, una sola vuelta.\n7. Escurre en papel y sirve al momento con limon.",
  "https://www.directoalpaladar.com/recetas-de-aperitivos/como-se-hace-el-cazon-en-adobo-receta-de-bienmesabe"),
}

# ---------------------------------------------------------------- INGREDIENTES
# (Ingrediente, Categoria, Unidad, EsStaple, ListaStaple)
S = "Si"; N = "No"
INGREDIENTES = [
 # Carniceria
 ("Pollo troceado","Carniceria","g",N,""),("Pollo en tiras","Carniceria","g",N,""),
 ("Alitas de pollo","Carniceria","g",N,""),("Carne picada de ternera","Carniceria","g",N,""),
 ("Filetes de ternera","Carniceria","g",N,""),("Entrecot de vaca","Carniceria","g",N,""),
 ("Costillas de cerdo","Carniceria","g",N,""),("Lomo de cerdo","Carniceria","g",N,""),
 ("Pinchitos","Carniceria","g",N,""),("Chuletas de cerdo","Carniceria","g",N,""),
 ("Aguja de vaca","Carniceria","g",N,""),("Carrillera de ternera","Carniceria","g",N,""),
 ("Presa de cerdo","Carniceria","g",N,""),("Secreto de cerdo","Carniceria","g",N,""),
 ("Pluma de cerdo","Carniceria","g",N,""),("Chuleton de buey","Carniceria","g",N,""),
 ("Chuletas de cordero","Carniceria","g",N,""),
 # Charcuteria
 ("Chorizo","Charcuteria","g",N,""),("Chorizo parrilla","Charcuteria","g",N,""),
 ("Morcilla","Charcuteria","g",N,""),("Longaniza","Charcuteria","g",N,""),
 ("Panceta","Charcuteria","g",N,""),("Bacon","Charcuteria","g",N,""),
 ("Salchichas","Charcuteria","g",N,""),("Chistorra","Charcuteria","g",N,""),
 ("Jamon serrano","Charcuteria","g",N,""),("Jamon cocido","Charcuteria","g",N,""),
 ("Salami/pepperoni","Charcuteria","g",N,""),
 # Pescaderia
 ("Boquerones","Pescaderia","g",N,""),("Calamar","Pescaderia","g",N,""),
 ("Rosada","Pescaderia","g",N,""),("Cazon","Pescaderia","g",N,""),
 ("Gambas/langostinos","Pescaderia","g",N,""),("Mejillones","Pescaderia","g",N,""),
 ("Almejas","Pescaderia","g",N,""),
 # Fruteria
 ("Berenjena","Fruteria","g",N,""),("Patata","Fruteria","g",N,""),
 ("Cebolla","Fruteria","g",N,""),("Cebolleta","Fruteria","g",N,""),
 ("Pimiento rojo","Fruteria","g",N,""),("Pimiento verde","Fruteria","g",N,""),
 ("Zanahoria","Fruteria","g",N,""),("Calabacin","Fruteria","g",N,""),
 ("Tomate","Fruteria","g",N,""),("Tomate maduro","Fruteria","g",N,""),
 ("Ajo","Fruteria","g",S,"Cocina"),("Champinones","Fruteria","g",N,""),
 ("Lechuga","Fruteria","g",N,""),("Limon","Fruteria","ud",N,""),
 ("Mazorcas","Fruteria","ud",N,""),("Perejil","Fruteria","g",N,""),
 # Panaderia
 ("Pan","Panaderia","g",N,""),("Pan del dia anterior","Panaderia","g",N,""),
 ("Pan de hamburguesa","Panaderia","ud",N,""),("Masa de pizza","Panaderia","g",N,""),
 ("Tortillas de trigo","Panaderia","ud",N,""),
 # Lacteos
 ("Leche","Lacteos","ml",N,""),("Mantequilla","Lacteos","g",N,""),
 ("Queso rallado","Lacteos","g",N,""),("Mozzarella","Lacteos","g",N,""),
 ("Queso en lonchas","Lacteos","g",N,""),("Nata agria","Lacteos","g",N,""),
 ("Huevo","Lacteos","ud",N,""),
 # Despensa (staples marcados)
 ("Arroz","Despensa","g",N,""),("Semola couscous","Despensa","g",N,""),
 ("Garbanzos cocidos","Despensa","g",N,""),("Alubias rojas cocidas","Despensa","g",N,""),
 ("Lata de maiz","Despensa","g",N,""),("Pasas","Despensa","g",N,""),
 ("Caldo de pollo","Despensa","ml",N,""),("Caldo de carne","Despensa","ml",N,""),
 ("Caldo de pescado","Despensa","ml",N,""),("Azafran","Despensa","g",S,"Cocina"),
 ("Tomate natural","Despensa","g",N,""),("Tomate tamizado","Despensa","g",N,""),
 ("Tomate frito","Despensa","g",N,""),("Guacamole","Despensa","g",N,""),
 ("Pimiento morron asado","Despensa","g",N,""),
 ("Aceitunas negras","Despensa","g",N,""),("Pepinillos","Despensa","g",N,""),
 ("Harina","Despensa","g",S,"Cocina"),("Harina de freir","Despensa","g",S,"Cocina"),
 ("Aceite de oliva","Despensa","ml",S,"Cocina"),("AOVE","Despensa","ml",S,"Cocina"),
 ("Aceite de girasol","Despensa","ml",S,"Cocina"),("Vinagre","Despensa","ml",S,"Cocina"),
 ("Pimenton","Despensa","g",S,"Cocina"),("Pimenton picante","Despensa","g",S,"Cocina"),
 ("Comino","Despensa","g",S,"Cocina"),("Canela","Despensa","g",S,"Cocina"),
 ("Nuez moscada","Despensa","g",S,"Cocina"),("Ras el hanout","Despensa","g",S,"Cocina"),
 ("Especias fajita","Despensa","g",S,"Cocina"),("Oregano","Despensa","g",S,"Cocina"),
 ("Jengibre","Despensa","g",S,"Cocina"),("Curcuma","Despensa","g",S,"Cocina"),
 ("Romero","Despensa","g",S,"Cocina"),("Sal","Despensa","g",S,"Cocina"),
 ("Sal gorda","Despensa","g",S,"Cocina"),("Sal de escamas","Despensa","g",S,"Cocina"),
 ("Pimienta","Despensa","g",S,"Cocina"),
 ("Ketchup","Despensa","g",S,"Cocina"),("Mostaza","Despensa","g",S,"Cocina"),
 ("Mayonesa","Despensa","g",S,"Cocina"),("Alioli","Despensa","g",S,"Cocina"),
 ("Chimichurri","Despensa","g",S,"Cocina"),
 # Bebidas (vino de cocina como staple)
 ("Vino tinto","Bebidas","ml",S,"Cocina"),("Vino blanco","Bebidas","ml",S,"Cocina"),
 # Congelados
 ("Guisantes","Congelados","g",N,""),("Patatas congeladas","Congelados","g",N,""),
]

# ---------------------------------------------------------------- RECETAS
# (Comida, Ingrediente, CantidadPorComensal, Grupo, PesoEnGrupo, Opcional)
def r(c,i,q,g="",p="",o="No"): return (c,i,q,g,p,o)
RECETAS = [
 # Arroz campero
 r("Arroz campero","Arroz",100),r("Arroz campero","Aguja de vaca",150),
 r("Arroz campero","Pimiento morron asado",30),
 r("Arroz campero","Chorizo",30),r("Arroz campero","Pimiento rojo",40),
 r("Arroz campero","Pimiento verde",40),r("Arroz campero","Cebolla",40),
 r("Arroz campero","Tomate natural",50),r("Arroz campero","Guisantes",30),
 r("Arroz campero","Ajo",3),r("Arroz campero","Caldo de pollo",250),
 r("Arroz campero","Aceite de oliva",15),r("Arroz campero","Pimenton",2),r("Arroz campero","Sal",2),
 # Mousaka
 r("Mousaka griega","Berenjena",200),r("Mousaka griega","Patata",100),
 r("Mousaka griega","Carne picada de ternera",150),r("Mousaka griega","Cebolla",50),
 r("Mousaka griega","Tomate tamizado",100),r("Mousaka griega","Ajo",3),
 r("Mousaka griega","Vino tinto",20),r("Mousaka griega","Leche",150),
 r("Mousaka griega","Mantequilla",15),r("Mousaka griega","Harina",15),
 r("Mousaka griega","Queso rallado",25),r("Mousaka griega","Huevo",0.25),
 r("Mousaka griega","Aceite de oliva",20),r("Mousaka griega","Canela",0.5),
 r("Mousaka griega","Nuez moscada",0.2),r("Mousaka griega","Sal",2),
 # Couscous
 r("Couscous","Semola couscous",90),r("Couscous","Carrillera de ternera",150),
 r("Couscous","Cebolla",60),r("Couscous","Zanahoria",60,"","","Si"),
 r("Couscous","Calabacin",60),r("Couscous","Garbanzos cocidos",50),
 r("Couscous","Tomate tamizado",30),r("Couscous","Pimiento rojo",40),
 r("Couscous","Pasas",15),r("Couscous","Caldo de pollo",150),
 r("Couscous","Aceite de oliva",15),r("Couscous","Ras el hanout",3),r("Couscous","Sal",2),
 # Plato alpujarreno
 r("Plato alpujarreno con huevos","Patata",200),r("Plato alpujarreno con huevos","Morcilla",50),
 r("Plato alpujarreno con huevos","Chorizo",50),r("Plato alpujarreno con huevos","Longaniza",50),
 r("Plato alpujarreno con huevos","Lomo de cerdo",80),r("Plato alpujarreno con huevos","Jamon serrano",20),
 r("Plato alpujarreno con huevos","Huevo",1.5),r("Plato alpujarreno con huevos","Pimiento verde",40),
 r("Plato alpujarreno con huevos","Aceite de oliva",30),r("Plato alpujarreno con huevos","Sal",2),
 # Salmorejo
 r("Salmorejo con acompanamiento","Tomate maduro",250),r("Salmorejo con acompanamiento","Pan",60),
 r("Salmorejo con acompanamiento","Ajo",3),r("Salmorejo con acompanamiento","AOVE",40),
 r("Salmorejo con acompanamiento","Vinagre",5),r("Salmorejo con acompanamiento","Sal",3),
 r("Salmorejo con acompanamiento","Huevo",0.5),r("Salmorejo con acompanamiento","Jamon serrano",15),
 r("Salmorejo con acompanamiento","Filetes de ternera",180,"Acompanamiento","1"),
 # Migas
 r("Migas","Pan del dia anterior",120),r("Migas","Chorizo",40),r("Migas","Panceta",40),
 r("Migas","Ajo",5),r("Migas","Pimiento verde",30),r("Migas","Aceite de oliva",25),
 r("Migas","Pimenton",2),r("Migas","Sal",2),
 # Chili
 r("Chili con carne","Carne picada de ternera",150),r("Chili con carne","Alubias rojas cocidas",80),
 r("Chili con carne","Cebolla",60),r("Chili con carne","Pimiento rojo",50),
 r("Chili con carne","Tomate natural",120),r("Chili con carne","Ajo",3),
 r("Chili con carne","Lata de maiz",30),r("Chili con carne","Comino",2),
 r("Chili con carne","Pimenton picante",1),r("Chili con carne","Caldo de carne",50),
 r("Chili con carne","Aceite de oliva",15),r("Chili con carne","Arroz",60),r("Chili con carne","Sal",2),
 # Asado pollo
 r("Asado de pollo y patatas","Pollo troceado",350),r("Asado de pollo y patatas","Patata",250),
 r("Asado de pollo y patatas","Cebolla",80),r("Asado de pollo y patatas","Ajo",5),
 r("Asado de pollo y patatas","Limon",0.25),r("Asado de pollo y patatas","Vino blanco",30),
 r("Asado de pollo y patatas","Aceite de oliva",20),r("Asado de pollo y patatas","Romero",0.5),
 r("Asado de pollo y patatas","Sal",3),
 # Pisto
 r("Pisto de verduras con huevos","Cebolla",100),r("Pisto de verduras con huevos","Pimiento verde",100),
 r("Pisto de verduras con huevos","Tomate frito",120),r("Pisto de verduras con huevos","Huevo",1.5),
 r("Pisto de verduras con huevos","Aceite de oliva",25),r("Pisto de verduras con huevos","Sal",2),
 # Barbacoa 1 (grupo Carne) - cerdo y embutido, carne fresca
 r("Barbacoa 1","Presa de cerdo",70,"Carne","70"),r("Barbacoa 1","Secreto de cerdo",50,"Carne","50"),
 r("Barbacoa 1","Pluma de cerdo",40,"Carne","40"),r("Barbacoa 1","Panceta",40,"Carne","40"),
 r("Barbacoa 1","Pinchitos",40,"Carne","40"),r("Barbacoa 1","Chorizo parrilla",30,"Carne","30"),
 r("Barbacoa 1","Morcilla",20,"Carne","20"),r("Barbacoa 1","Mazorcas",0.5),
 r("Barbacoa 1","Pan",80),r("Barbacoa 1","Pimiento verde",40),
 r("Barbacoa 1","Sal gorda",3),r("Barbacoa 1","Alioli",20),
 # Barbacoa 2 (grupo Carne) - vacuno, cordero y verdura, sin pollo, carne fresca
 r("Barbacoa 2","Entrecot de vaca",100,"Carne","100"),r("Barbacoa 2","Chuleton de buey",70,"Carne","70"),
 r("Barbacoa 2","Chuletas de cordero",60,"Carne","60"),r("Barbacoa 2","Chistorra",30,"Carne","30"),
 r("Barbacoa 2","Chorizo parrilla",30,"Carne","30"),r("Barbacoa 2","Calabacin",60),
 r("Barbacoa 2","Cebolleta",40),r("Barbacoa 2","Pimiento rojo",40),r("Barbacoa 2","Mazorcas",0.5),
 r("Barbacoa 2","Pan",80),r("Barbacoa 2","Sal gorda",3),r("Barbacoa 2","Chimichurri",20),
 # Fajitas
 r("Fajitas","Pollo en tiras",150),r("Fajitas","Tortillas de trigo",2),
 r("Fajitas","Pimiento rojo",50),r("Fajitas","Pimiento verde",50),
 r("Fajitas","Cebolla",60),r("Fajitas","Queso rallado",30),
 r("Fajitas","Nata agria",30),r("Fajitas","Tomate",40),r("Fajitas","Lechuga",30),
 r("Fajitas","Especias fajita",3),r("Fajitas","Aceite de oliva",10),r("Fajitas","Guacamole",30),
 # Hamburguesas
 r("Hamburguesas","Carne picada de ternera",180),r("Hamburguesas","Pan de hamburguesa",1.5),
 r("Hamburguesas","Queso en lonchas",20),r("Hamburguesas","Lechuga",20),
 r("Hamburguesas","Tomate",40),r("Hamburguesas","Cebolla",30),
 r("Hamburguesas","Bacon",30),r("Hamburguesas","Pepinillos",15),
 r("Hamburguesas","Ketchup",10),r("Hamburguesas","Mostaza",5),
 r("Hamburguesas","Mayonesa",10),r("Hamburguesas","Patatas congeladas",150),
 # Pizzas
 r("Pizzas","Masa de pizza",150),r("Pizzas","Tomate natural",60),
 r("Pizzas","Mozzarella",80),r("Pizzas","Jamon cocido",30),
 r("Pizzas","Salami/pepperoni",25),r("Pizzas","Champinones",30),
 r("Pizzas","Pimiento rojo",20),r("Pizzas","Aceitunas negras",15),
 r("Pizzas","Oregano",1),r("Pizzas","Aceite de oliva",5),
 # Fritura (grupo Pescado)
 r("Fritura de pescado","Boquerones",80,"Pescado","80"),r("Fritura de pescado","Calamar",80,"Pescado","80"),
 r("Fritura de pescado","Rosada",70,"Pescado","70"),r("Fritura de pescado","Cazon",70,"Pescado","70"),
 r("Fritura de pescado","Harina de freir",60),r("Fritura de pescado","Aceite de girasol",80),
 r("Fritura de pescado","Limon",0.5),r("Fritura de pescado","Sal",2),r("Fritura de pescado","Perejil",1),
 r("Fritura de pescado","Vinagre",10),r("Fritura de pescado","Pimenton",2),
 r("Fritura de pescado","Comino",1),r("Fritura de pescado","Ajo",3),r("Fritura de pescado","Oregano",1),
 # Paella de marisco (opcion alternativa de arroz)
 r("Paella de marisco","Arroz",100),r("Paella de marisco","Gambas/langostinos",80),
 r("Paella de marisco","Mejillones",80),r("Paella de marisco","Calamar",60),
 r("Paella de marisco","Almejas",50),r("Paella de marisco","Caldo de pescado",250),
 r("Paella de marisco","Tomate natural",40),r("Paella de marisco","Cebolla",30),
 r("Paella de marisco","Pimiento rojo",30),r("Paella de marisco","Ajo",3),
 r("Paella de marisco","Guisantes",20),r("Paella de marisco","Aceite de oliva",15),
 r("Paella de marisco","Pimenton",2),r("Paella de marisco","Azafran",1),
 r("Paella de marisco","Limon",0.25),r("Paella de marisco","Sal",2),
]

# ---------------------------------------------------------------- CALENDARIO (slots vacios)
_DIAS = ["Sabado","Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado","Domingo"]
CALENDARIO = []
for i in range(9):
    d = date(2026,8,1+i); dow = _DIAS[i]; f = d.isoformat()
    if i == 0:
        CALENDARIO.append((f,dow,"Cena","","","",""))
    else:
        CALENDARIO.append((f,dow,"Almuerzo","","","",""))
        CALENDARIO.append((f,dow,"Cena","","","",""))

# ---------------------------------------------------------------- COMPRAS
COMPRAS = [
 ("2026-07-31","Compra grande inicial","Cubre los primeros dias"),
 ("2026-08-04","Reposicion","Frescos y lo que falte"),
 ("2026-08-07","Reposicion final",""),
]

# ---------------------------------------------------------------- DESPENSA (ejemplos)
DESPENSA = [
 ("Aceite de oliva","5000","ml","Ya tenemos 1 garrafa"),
 ("Sal","1000","g",""),
 ("Ajo","1","ud","Media ristra (ya en existencias)"),
 ("Ras el hanout","1","ud","Ya en existencias"),
 ("Jengibre","1","ud","Ya en existencias"),
 ("Curcuma","1","ud","Ya en existencias"),
 ("Comino","1","ud","Ya en existencias"),
]

# ---------------------------------------------------------------- BASICOS de cocina (compra unica)
STAPLES = [
 # Cocina
 ("Aceite de oliva","Cocina","Garrafa 5 L","No"),("AOVE","Cocina","Botella 1 L","No"),
 ("Aceite de girasol","Cocina","Botella 1 L (freir)","No"),("Sal","Cocina","Paquete 1 kg","No"),
 ("Sal de escamas","Cocina","Bote (barbacoa)","No"),("Pimienta","Cocina","Molinillo","No"),
 ("Pimenton dulce","Cocina","Lata","No"),("Pimenton picante","Cocina","Lata","No"),
 ("Comino","Cocina","Bote","No"),("Canela","Cocina","Bote","No"),
 ("Nuez moscada","Cocina","Bote","No"),("Ras el hanout","Cocina","Bote","No"),
 ("Especias fajita","Cocina","Sobre","No"),("Oregano","Cocina","Bote","No"),
 ("Romero","Cocina","Bote","No"),("Vinagre","Cocina","Botella 1 L","No"),
 ("Harina","Cocina","Paquete 1 kg","No"),("Harina de tempura","Cocina","Paquete","No"),
 ("Red de ajos","Cocina","Ristra/red","No"),("Ketchup","Cocina","Bote","No"),
 ("Mostaza","Cocina","Bote","No"),("Mayonesa","Cocina","Bote","No"),
 ("Alioli","Cocina","Bote","No"),("Chimichurri","Cocina","Bote/casero","No"),
 ("Vino tinto (cocina)","Cocina","Botella","No"),("Vino blanco (cocina)","Cocina","Botella","No"),
]

# ---------------------------------------------------------------- LISTAS ABIERTAS (por paquete)
# (Tipo, Item, Envase, TamanoEnvase, Unidad, ConsumoPersonaDia)
LISTAS_ABIERTAS = [
 ("Desayuno","Leche","Brik",1,"L",0.2),
 ("Desayuno","Cafe molido","Paquete",250,"g",15),
 ("Desayuno","Cereales","Caja",500,"g",30),
 ("Desayuno","Bizcochos","Paquete",400,"g",40),
 ("Desayuno","Pan de molde","Paquete",700,"g",50),
 ("Desayuno","Mantequilla","Tarrina",250,"g",8),
 ("Desayuno","Mermelada","Bote",340,"g",10),
 ("Desayuno","Zumo","Brik",1,"L",0.15),
 ("Desayuno","Galletas","Paquete",500,"g",25),
 ("Desayuno","Cacao soluble","Bote",400,"g",10),
 ("Desayuno","Fruta","Kg",1000,"g",120),
 # Bebidas (consumo por persona y dia)
 ("Bebidas","Agua","Garrafa",8,"L",1.0),
 ("Bebidas","Refresco de cola","Botella",2,"L",0.3),
 ("Bebidas","Refresco naranja/limon","Botella",2,"L",0.2),
 ("Bebidas","Cerveza","Lata",0.33,"L",0.5),
 ("Bebidas","Vino tinto","Botella",0.75,"L",0.15),
 ("Bebidas","Vino blanco","Botella",0.75,"L",0.1),
 ("Bebidas","Tinto de verano","Botella",1,"L",0.1),
 ("Bebidas","Hielo","Bolsa",2000,"g",100),
 # Picoteo (consumo por persona y dia)
 ("Picoteo","Patatas fritas","Bolsa",200,"g",25),
 ("Picoteo","Aceitunas","Bote",350,"g",15),
 ("Picoteo","Frutos secos","Bolsa",200,"g",15),
 ("Picoteo","Nachos","Bolsa",200,"g",15),
 ("Picoteo","Altramuces","Bote",400,"g",10),
 ("Picoteo","Encurtidos","Bote",300,"g",8),
]

# ---------------------------------------------------------------- USUARIOS
USUARIOS = [
 ("francisco.m.garcia@gmail.com","Google","Propietario"),
]

# ================================================================ helpers
ORDEN_CAT = ["Fruteria","Carniceria","Charcuteria","Pescaderia","Panaderia",
             "Lacteos","Congelados","Despensa","Bebidas"]

def fnum(x):
    if isinstance(x,float) and x.is_integer(): return str(int(x))
    return str(x)

def to_float(s): return float(str(s).replace(",",".").strip())

def _fmt(x):
    if abs(x-round(x))<1e-9: return str(int(round(x)))
    return ("%.2f"%x).rstrip("0").rstrip(".")

def legible(cant,uni):
    if uni=="g" and cant>=1000: return "%s kg"%_fmt(cant/1000.0)
    if uni=="ml" and cant>=1000: return "%s L"%_fmt(cant/1000.0)
    if uni=="ud": return "%s ud"%_fmt(math.ceil(cant))
    return "%s %s"%(_fmt(cant),uni)

def validate():
    ing={i[0] for i in INGREDIENTES}; com={c[0] for c in COMIDAS}; err=[]
    for c,i,q,g,p,o in RECETAS:
        if c not in com: err.append("comida inexistente: %r"%c)
        if i not in ing: err.append("ingrediente fuera de catalogo: %r"%i)
    if err: raise SystemExit("ERRORES:\n  "+"\n  ".join(sorted(set(err))))

def compute_lista():
    cfg={k:v for k,v,_ in CONFIG}
    raciones = to_float(cfg["AdultosM"])+to_float(cfg["AdultosF"])+to_float(cfg["Ninos"])*to_float(cfg["FactorNino"])
    meta={i[0]:(i[1],i[2],i[3]) for i in INGREDIENTES}  # cat,uni,staple
    tot={}
    for c,i,q,g,p,o in RECETAS:
        cat,uni,st=meta[i]
        if st=="Si": continue                 # staples no se escalan
        tot[i]=tot.get(i,0.0)+to_float(q)*raciones
    filas=[]
    for i,cant in tot.items():
        cat,uni,st=meta[i]
        filas.append([cat,i,_fmt(round(cant,1)),uni,legible(cant,uni),"No",""])
    filas.sort(key=lambda f:(ORDEN_CAT.index(f[0]) if f[0] in ORDEN_CAT else 99, f[1].lower()))
    return raciones,filas

def compute_desayunos():
    cfg={k:v for k,v,_ in CONFIG}
    personas=to_float(cfg["AdultosM"])+to_float(cfg["AdultosF"])+to_float(cfg["Ninos"])
    dias_des=to_float(cfg["DiasDesayuno"]); dias_ev=to_float(cfg["DiasEvento"])
    rows=[]
    for tipo,item,env,tam,uni,cons in LISTAS_ABIERTAS:
        dias = dias_des if tipo=="Desayuno" else dias_ev
        total=cons*personas*dias
        paq=math.ceil(total/tam) if tam else 0
        rows.append([tipo,item,env,fnum(tam),uni,fnum(cons),str(paq),"No"])
    return rows

# ================================================================ writers
def write_csv(name,header,rows):
    with open(os.path.join(DATA,name),"w",newline="",encoding="utf-8") as f:
        w=csv.writer(f); w.writerow(header)
        for row in rows: w.writerow([fnum(c) if not isinstance(c,str) else c for c in row])

def build():
    validate()
    raciones,lista=compute_lista()
    desay=compute_desayunos()

    tables={
      "Config":(["Clave","Valor","Descripcion"],[list(x) for x in CONFIG]),
      "Comidas":(["Comida","MomentoSugerido","Cocinero","Preparacion","Fuente","Notas"],
                 [[c[0],c[1],c[2],PREP.get(c[0],(c[3],""))[0],PREP.get(c[0],("",""))[1],c[4]] for c in COMIDAS]),
      "Ingredientes":(["Ingrediente","Categoria","Unidad","EsBasico","ListaBasico"],[list(x) for x in INGREDIENTES]),
      "Recetas":(["Comida","Ingrediente","CantidadPorComensal","Grupo","PesoEnGrupo","Opcional"],[list(x) for x in RECETAS]),
      "Calendario":(["Fecha","DiaSemana","Momento","Comida","Cocinero","NivelCarne","Notas"],[list(x) for x in CALENDARIO]),
      "Compras":(["Fecha","Etiqueta","Notas"],[list(x) for x in COMPRAS]),
      "Despensa":(["Ingrediente","Cantidad","Unidad","Notas"],[list(x) for x in DESPENSA]),
      "Basicos":(["Item","Lista","Formato","Comprado"],[list(x) for x in STAPLES]),
      "ListasAbiertas":(["Tipo","Item","Envase","TamanoEnvase","Unidad","ConsumoPersonaDia","Paquetes","Comprado"],desay),
      "Usuarios":(["Email","Proveedor","Rol"],[list(x) for x in USUARIOS]),
      "ListaCompra":(["Categoria","Ingrediente","Cantidad","Unidad","CantidadLegible","Comprado","Notas"],lista),
    }
    for name,(header,rows) in tables.items():
        write_csv(name+".csv",header,rows)

    # xlsx multi-hoja
    from openpyxl import Workbook
    wb=Workbook(); wb.remove(wb.active)
    for name,(header,rows) in tables.items():
        ws=wb.create_sheet(title=name); ws.append(header)
        for row in rows: ws.append([fnum(c) if not isinstance(c,str) else c for c in row])
    xlsx=os.path.join(DATA,"CompraSanJose.xlsx"); wb.save(xlsx)

    print("Raciones (platos generales): %g"%raciones)
    print("Tablas: "+", ".join(tables.keys()))
    print("Ingredientes en ListaCompra: %d  |  Desayunos (items): %d"%(len(lista),len(desay)))
    print("Escrito: data/CompraSanJose.xlsx + %d CSV"%len(tables))

if __name__=="__main__":
    build()
