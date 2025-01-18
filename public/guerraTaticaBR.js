//#region Constantes e variáveis principais
const divMapa = document.getElementById("mapa");
const svgMapaObject = document.getElementById("mapaSVG");
const divBarraSuperior = document.getElementById("barraSuperior");
const divBarraInferior = document.getElementById("barraInferior");
const divAcoes = document.getElementById("acoes");
const spanStatus = document.getElementById("status");
const spanNumAcoes = document.getElementById("numAcoes");
const divBotoesAcoes = document.getElementById("botoesAcoes");
const divListaAcoes = document.getElementById("listaAcoes");
const imagemJogador = document.getElementById("imagemJogador");
const pJogador = document.getElementById("pJogador");
const divCabecalhoJogador = document.getElementById("cabecalhoJogador");
const pturno = document.getElementById("turno");
const botaoRodarTurno = document.getElementById("botaoRodarTurno");
const divListaTerritoriosJogadores = document.getElementById("listaTerritoriosJogadores");
const dialogEscolhaJogador = document.getElementById("dialogEscolhaJogador");

const gameStates = {
	STANDBY: "STANDBY",
	ESTADOSELECIONADO: "ESTADOSELECIONADO",
	ATACARESTADO: "ATACARESTADO",
	CONSTRUIRMURO: "CONSTRUIRMURO",
	AGUARDAR: "AGUARDAR",
}
const tiposAcoes = {
	ATAQUE: "atq",
	REFORCO: "ref",
	DEFESA: "def",
}

var mapaEscala = 1;
var mapaPosX = 0;
var mapaPosY = 0;
var mapaRotX = 0;

var jogador = null;
var estadoJogador = null;
var estadoSelecionado = null;
var estadoSelecionadoAntes = null;
var numAcoesMax = 0;
var numAcoes = 0;
var qtdAmpliaAcoes = 5;
var inicializado = false;

var dataTurno = new Date(new Date().getFullYear() + 2, 0, 1);
var etapasTurnos = null;
var intervalosTurnos = null;
var tempoTurnos = 2000;
var acelerar = false;

var gameState = gameStates.STANDBY;

var svgMapa = null;

svgMapaObject.onload = (e)=>{
	if (!inicializado) {
		console.log("Mapa pronto");
		//inicializar();
	}
}
//#endregion





//#region Classes

var estados = [];
class Estado {
	constructor({ id, svgId, nome, corMatiz, corSaturacao, vizinhos, acessoAgua }) {
		this.id = id;
		this.nome = nome;
		this.vida = 1;
		this.corMatiz = corMatiz;
		this.corSaturacao = corSaturacao;
		this.cor = hslToHex(this.corMatiz, this.corSaturacao, 50);
		this.acessoAgua = acessoAgua;
		this.controlador = obterJogador(this.id);
		//console.log("Criando estado " + this.id);
		this.imagem = this.controlador.imagem;
		this.svg = svgMapa.getElementById(svgId);
		this.atualizarSVG();
		this.svg.addEventListener('mouseover', () => {
            this.svg.style.cursor = 'pointer';
        });
        this.svg.addEventListener('mouseout', () => {
            this.svg.style.cursor = 'default';
        });
		this.svg.addEventListener('click', () => {
			clicarEstado(this);
		});
		
		this.vizinhos = vizinhos;
		for (let i = 0; i < this.vizinhos.length; i++) {
			let vizinho = this.vizinhos[i];
			if (typeof vizinho == "string") {
				let objetoVizinho = estados.find(estado => estado.id === vizinho);
				if (objetoVizinho != undefined) {
					this.vizinhos[i] = objetoVizinho;
					let index = objetoVizinho.vizinhos.indexOf(this.id);
					if (index !== -1) {
						objetoVizinho.vizinhos[index] = this;
					}
				}
			}
		}
		
		estados.push(this);
	}
	atualizarSVG() {
		let luminosidade = this.vida > 0 ? 40 + ((this.vida - 1) * 15) : 0;
		this.svg.style.fill = `hsl(${this.corMatiz}, ${this.corSaturacao}%, ${luminosidade}%)`;
	}
	atualizarControlador(argJogador) {
		this.controlador = argJogador;
		this.corMatiz = this.controlador.corMatiz;
		this.corSaturacao = this.controlador.corSaturacao;
		this.cor = hslToHex(this.corMatiz, this.corSaturacao, 50);
		this.atualizarSVG();
	}
}
var acoes = [];
class Acao {
	constructor(argOrigem, argTipo, argDestino=null, argAgua = false) {
		this.origem = argOrigem;
		this.tipo = argTipo;
		this.destino = argDestino;
		this.agua = argAgua;
		this.controlador = argOrigem.controlador;

		let texto = this.origem.id;
		texto += this.tipo;
		if (this.destino!=null) { texto += this.destino.id; }

		this.excluir = false;

		this.svgs = [];
		this.svgsId = [];
		switch (this.tipo) {
			case tiposAcoes.ATAQUE: {
				this.texto = "🎯";
				if (!this.agua) {
					this.svgsId.push(this.tipo + "_" + this.origem.id + "-" + this.destino.id);
				} else {
					this.svgsId.push(this.tipo + "MarOut_" + this.origem.id);
					this.svgsId.push(this.tipo + "MarIn_" + this.destino.id);
				}
			} break;
			case tiposAcoes.DEFESA: {
				this.texto = "🧱";
				this.svgsId.push(this.tipo + "_" + this.origem.id + "-" + this.destino.id);
				this.svgsId.push(this.tipo + "_" + this.destino.id + "-" + this.origem.id);
			} break;
			case tiposAcoes.REFORCO: {
				this.texto = "🛡";
				this.svgsId.push(this.tipo + "_" + this.origem.id);
			}
		}
		this.svgsId.forEach(id => {
			let svgElement = svgMapa.getElementById(id);
			if (svgElement) {
				this.svgs.push(svgElement);
				svgElement.style.display = null;
			}
		});
		this.svgs = this.svgs.filter(svg => svg !== null);
		this.svgsId = this.svgsId.filter((id, index) => this.svgs[index] !== null);

		this.el = document.createElement("div");
		this.el.classList.add("acao");
		this.el_imagemOrigem = document.createElement("img");
		this.el_imagemOrigem.src = "estrutura/" + this.origem.imagem;
		this.el_imagemOrigem.classList.add("bandeira");
		this.el_imagemOrigem.title = this.origem.nome;
		this.el.appendChild(this.el_imagemOrigem);
		this.el_texto = document.createElement("p");
		this.el_texto.innerHTML = this.texto;
		this.el.appendChild(this.el_texto);
		if (this.destino!=null) {
			this.el_imagemDestino = document.createElement("img");
			this.el_imagemDestino.src = "estrutura/" + this.destino.imagem;
			this.el_imagemDestino.classList.add("bandeira");
			this.el_imagemDestino.title = this.destino.nome;
			this.el.appendChild(this.el_imagemDestino);
		}
		divListaAcoes.appendChild(this.el);

		acoes.push(this);
		if (this.controlador === jogador) {
			atualizarQuantidadeDeAcoes();
		}
	}
	executar() {
		if (!this.excluir) {
			switch (this.tipo) {
				case tiposAcoes.REFORCO: {
					focarEstado(this.origem);
					this.origem.vida += 1;
					this.origem.atualizarSVG();
					logExecucao("Reforço ao território de " + this.origem.nome + ", agora com " + this.origem.vida + " vidas.",this.origem.controlador);
				} break;
				case tiposAcoes.ATAQUE: {
					focarEstado(this.destino);
					if (this.destino.vida > 0) {
						let muroExistente = muros.find(muro => 
							(muro.estado1 === this.origem && muro.estado2 === this.destino) || 
							(muro.estado1 === this.destino && muro.estado2 === this.origem));
						if (muroExistente) {
							muroExistente.destruirMuro();
							logExecucao("Ataque do território de " + this.origem.nome + " ao território de " + this.destino.nome + ", impedido pelo muro, que foi destruído.",this.origem.controlador);
						} else {
							this.destino.vida -= 1;
							this.destino.atualizarSVG();
							logExecucao("Ataque " + (this.agua ? "marítimo " : "") + "do território de " + this.origem.nome + " ao território de " + this.destino.nome + " sob controle de " + this.destino.controlador.nome + ".", this.origem.controlador);
						}
					}
					if (this.destino.vida == 0) {
						this.destino.vida = 1;
						this.destino.atualizarControlador(this.origem.controlador);
						logExecucao("O território de " + this.destino.nome + " foi conquistado por " + this.origem.controlador.nome + ".",this.origem.controlador);
						acoes.filter(acao => acao.origem === this.destino).forEach(acao => acao.invalidar());
						verificarJogadores();
					}
				} break;
				case tiposAcoes.DEFESA: {
					focarEstado(this.origem);
					if (!muros.some(muro => 
						(muro.estado1 === this.origem && muro.estado2 === this.destino) || 
						(muro.estado1 === this.destino && muro.estado2 === this.origem))) {
							new Muro(this.origem, this.destino);
							logExecucao("O território de " + this.origem.nome + " criou um muro na fronteira com " + this.destino.nome, this.origem.controlador);
					}
				} break;
			}
			this.excluir = true;
			return true;
		} else {
			return false;
		}
	}
	invalidar() {
		this.excluir = true;
		this.svgs.forEach(svg => {
			svg.style.display = "none";
		});
		this.el.classList.add("invalida");
	}
	apagar() {
		this.invalidar();
		this.el.remove();
		const index = acoes.indexOf(this);
		if (index > -1) {
			acoes.splice(index, 1);
		}
		if (this.controlador == jogador) {
			atualizarQuantidadeDeAcoes();
		}
	}
}
var muros = [];
class Muro {
	constructor(argEstado1,argEstado2) {
		this.estado1 = argEstado1;
		this.estado2 = argEstado2;
		this.svgId = "mur_" + this.estado1.id + "-" + this.estado2.id;
		this.svg = svgMapa.getElementById(this.svgId);
		if (this.svg == null) {
			this.svgId = "mur_" + this.estado2.id + "-" + this.estado1.id;
			this.svg = svgMapa.getElementById(this.svgId);
		}
		this.svg.style.display = null;
		muros.push(this);
	}
	destruirMuro() {
		this.svg.style.display = "none";
		const index = muros.indexOf(this);
		if (index > -1) {
			muros.splice(index, 1);
		}
	}
}
var jogadores = [];
class Jogador {
	constructor(argId,argNome,argSVGId,argCorMatiz,argCorSaturacao,argUsuario = null) {
		this.id = argId;
		this.nome = argNome;
		this.svgId = argSVGId;
		this.imagem = this.svgId + ".svg";
		this.usuario = argUsuario;
		this.cpu = false;
		this.derrotado = false;
		this.corMatiz = argCorMatiz;
		this.corSaturacao = argCorSaturacao;
		this.cor = hslToHex(this.corMatiz, this.corSaturacao, 50);
		if (this.usuario === null) {
			this.cpu = true;
		}
		jogadores.push(this);

		this.botaoEscolhaJogador = document.createElement("button");
		this.botaoEscolhaJogador.onclick = (e)=>{
			definirJogador(this.id);
			dialogEscolhaJogador.close();
		}
		this.imagemEscolhaJogador = document.createElement("img")
		this.imagemEscolhaJogador.src = "estrutura/" + this.svgId + ".svg";
		this.nomeEscolhaJogador = document.createElement("p");
		this.nomeEscolhaJogador.innerHTML = this.nome;
		this.botaoEscolhaJogador.appendChild(this.imagemEscolhaJogador);
		this.botaoEscolhaJogador.appendChild(this.nomeEscolhaJogador);
		divListaTerritoriosJogadores.appendChild(this.botaoEscolhaJogador);
	}
	perder() {
		acoes.filter(acao => acao.controlador === this).forEach(acao => acao.invalidar());
		this.derrotado = true;
		logExecucao(`${this.nome} foi derrotado.`);
	}
}
//#endregion





//#region Funções
function moverMapa(argX,argY,argRelativo = true) {
	if (argRelativo) {
		mapaPosX += argX;
		mapaPosY += argY;
	} else {
		mapaPosX = argX;
		mapaPosY = argY;
	}
	svgMapaObject.style.left = -mapaPosX + "px";
	svgMapaObject.style.top = -mapaPosY + "px";
}
function zoomMapa(argZoom = 0) {
	if (argZoom === -0) {
		let mapaWidth = svgMapaObject.clientWidth;
		let mapaHeight = svgMapaObject.clientHeight;
		let parentWidth = divMapa.clientWidth;
		let parentHeight = divMapa.clientHeight;
		let scaleX = parentWidth / mapaWidth;
		let scaleY = parentHeight / mapaHeight;

		mapaEscala = Math.min(scaleX, scaleY);
		moverMapa(
			-(divMapa.clientWidth - svgMapaObject.clientWidth) / 2,
			-(divMapa.clientHeight - svgMapaObject.clientHeight) / 2,
			false
		);
	} else {
		mapaEscala = argZoom;
		if (mapaEscala < 0.5) mapaEscala = 0.5;
		if (mapaEscala > 2) mapaEscala = 2;
	}
	svgMapaObject.style.transform = `scale(${mapaEscala}) rotateX(${mapaRotX}deg)`;
}
function focarEstado(argEstado) {
	if (acelerar) {
		return;
	}
	zoomMapa(1);
	let estadoBBox = argEstado.svg.getBBox();
	let mapaBBox = svgMapa.getBBox();
	let estadoBBoxN = {
		x: (estadoBBox.x / mapaBBox.width) * svgMapaObject.offsetWidth,
		y: (estadoBBox.y / mapaBBox.height) * svgMapaObject.offsetHeight,
		width: (estadoBBox.width / mapaBBox.width) * svgMapaObject.offsetWidth,
		height: (estadoBBox.height / mapaBBox.height) * svgMapaObject.offsetHeight
	};
	let posX = estadoBBoxN.x + (estadoBBoxN.width / 2) - (divMapa.offsetWidth/2);
	let posY = estadoBBoxN.y + (estadoBBoxN.height / 2) - (divMapa.offsetHeight/2);
	moverMapa(posX,posY,false);
}
async function iniciarEstados() {
	const estrutura = [
		{"id": "AC", "svgId": "BR-AC", "nome": "Acre", "corMatiz": 144, "corSaturacao": 50, "vizinhos": ["RO", "AM"], "acessoAgua": false},
		{"id": "AL", "svgId": "BR-AL", "nome": "Alagoas", "corMatiz": 176, "corSaturacao": 50, "vizinhos": ["SE", "BA", "PE"], "acessoAgua": true},
		{"id": "AM", "svgId": "BR-AM", "nome": "Amazonas", "corMatiz": 208, "corSaturacao": 50, "vizinhos": ["AC", "RO", "RR", "MT", "PA"], "acessoAgua": false},
		{"id": "AP", "svgId": "BR-AP", "nome": "Amapá", "corMatiz": 240, "corSaturacao": 50, "vizinhos": ["PA"], "acessoAgua": true},
		{"id": "BA", "svgId": "BR-BA", "nome": "Bahia", "corMatiz": 272, "corSaturacao": 50, "vizinhos": ["ES", "MG", "GO", "TO", "PI", "PE", "AL", "SE"], "acessoAgua": true},
		{"id": "CE", "svgId": "BR-CE", "nome": "Ceará", "corMatiz": 304, "corSaturacao": 50, "vizinhos": ["PI", "RN", "PB", "PE"], "acessoAgua": true},
		{"id": "DF", "svgId": "BR-DF", "nome": "Distrito Federal", "corMatiz": 336, "corSaturacao": 75, "vizinhos": ["GO"], "acessoAgua": false},
		{"id": "ES", "svgId": "BR-ES", "nome": "Espírito Santo", "corMatiz": 8, "corSaturacao": 75, "vizinhos": ["RJ", "MG", "BA"], "acessoAgua": true},
		{"id": "GO", "svgId": "BR-GO", "nome": "Goiás", "corMatiz": 40, "corSaturacao": 75, "vizinhos": ["DF", "MG", "MS", "MT", "TO", "BA"], "acessoAgua": false},
		{"id": "MA", "svgId": "BR-MA", "nome": "Maranhão", "corMatiz": 72, "corSaturacao": 75, "vizinhos": ["TO", "PA", "PI"], "acessoAgua": true},
		{"id": "MG", "svgId": "BR-MG", "nome": "Minas Gerais", "corMatiz": 104, "corSaturacao": 75, "vizinhos": ["ES", "RJ", "SP", "MS", "GO", "BA"], "acessoAgua": false},
		{"id": "MS", "svgId": "BR-MS", "nome": "Mato Grosso do Sul", "corMatiz": 136, "corSaturacao": 75, "vizinhos": ["PR", "MT", "GO", "MG", "SP"], "acessoAgua": false},
		{"id": "MT", "svgId": "BR-MT", "nome": "Mato Grosso", "corMatiz": 168, "corSaturacao": 75, "vizinhos": ["MS", "GO", "TO", "PA", "AM", "RO"], "acessoAgua": false},
		{"id": "PA", "svgId": "BR-PA", "nome": "Pará", "corMatiz": 200, "corSaturacao": 75, "vizinhos": ["AP", "RR", "AM", "MT", "TO", "MA"], "acessoAgua": true},
		{"id": "PB", "svgId": "BR-PB", "nome": "Paraíba", "corMatiz": 232, "corSaturacao": 75, "vizinhos": ["CE", "RN", "PE"], "acessoAgua": true},
		{"id": "PE", "svgId": "BR-PE", "nome": "Pernambuco", "corMatiz": 264, "corSaturacao": 75, "vizinhos": ["AL", "BA", "PI", "CE", "PB"], "acessoAgua": true},
		{"id": "PI", "svgId": "BR-PI", "nome": "Piauí", "corMatiz": 296, "corSaturacao": 75, "vizinhos": ["MA", "CE", "PE", "BA", "TO"], "acessoAgua": true},
		{"id": "PR", "svgId": "BR-PR", "nome": "Paraná", "corMatiz": 328, "corSaturacao": 100, "vizinhos": ["MS", "SP", "SC"], "acessoAgua": true},
		{"id": "RJ", "svgId": "BR-RJ", "nome": "Rio de Janeiro", "corMatiz": 0, "corSaturacao": 100, "vizinhos": ["MG", "ES", "SP"], "acessoAgua": true},
		{"id": "RN", "svgId": "BR-RN", "nome": "Rio Grande do Norte", "corMatiz": 32, "corSaturacao": 100, "vizinhos": ["CE", "PB"], "acessoAgua": true},
		{"id": "RO", "svgId": "BR-RO", "nome": "Rondônia", "corMatiz": 64, "corSaturacao": 100, "vizinhos": ["AC", "AM", "MT"], "acessoAgua": false},
		{"id": "RR", "svgId": "BR-RR", "nome": "Roraima", "corMatiz": 96, "corSaturacao": 100, "vizinhos": ["AM", "PA"], "acessoAgua": false},
		{"id": "RS", "svgId": "BR-RS", "nome": "Rio Grande do Sul", "corMatiz": 128, "corSaturacao": 100, "vizinhos": ["SC"], "acessoAgua": true},
		{"id": "SC", "svgId": "BR-SC", "nome": "Santa Catarina", "corMatiz": 160, "corSaturacao": 100, "vizinhos": ["PR", "RS"], "acessoAgua": true},
		{"id": "SE", "svgId": "BR-SE", "nome": "Sergipe", "corMatiz": 192, "corSaturacao": 100, "vizinhos": ["BA", "AL"], "acessoAgua": true},
		{"id": "SP", "svgId": "BR-SP", "nome": "São Paulo", "corMatiz": 224, "corSaturacao": 100, "vizinhos": ["PR", "MS", "MG", "RJ"], "acessoAgua": true},
		{"id": "TO", "svgId": "BR-TO", "nome": "Tocantins", "corMatiz": 256, "corSaturacao": 100, "vizinhos": ["GO", "MT", "PA", "MA", "PI", "BA"], "acessoAgua": false}
	];
	estrutura.forEach(estadoData => {
		let jogador = new Jogador(estadoData.id, estadoData.nome, estadoData.svgId, estadoData.corMatiz, estadoData.corSaturacao);
	});
	estrutura.forEach(estadoData => new Estado(estadoData));
	estados.forEach(estado => {
		//console.log("Limpando de " + estado.id);
		let svgElementRef = svgMapa.getElementById(`ref_${estado.id}`);
		svgElementRef.style.display = "none";
		estado.vizinhos.forEach(vizinho => {
			let svgElementAtq = svgMapa.getElementById(`atq_${estado.id}-${vizinho.id}`);
			svgElementAtq.style.display = "none";
			let svgElementMur = svgMapa.getElementById(`mur_${estado.id}-${vizinho.id}`);
			if (svgElementMur==null) {
				svgElementMur = svgMapa.getElementById(`mur_${vizinho.id}-${estado.id}`);
				if (svgElementMur==null) {
					console.log("Não achei o muro de " + estado.id + " com " + vizinho.id);
				}
			}
			svgElementMur.style.display = "none";
		});
		if (estado.acessoAgua) {
			let svgElementIn = svgMapa.getElementById(`atqMarIn_${estado.id}`);
			let svgElementOut = svgMapa.getElementById(`atqMarOut_${estado.id}`);
			svgElementIn.style.display = "none";
			svgElementOut.style.display = "none";
		}
	});
	svgMapa.getElementById("Muros").style.display = null;
	svgMapa.getElementById("Reforcos").style.display = null;
	svgMapa.getElementById("Ataques").style.display = null;
	svgMapa.getElementById("AtaqueMarOut").style.display = null;
	svgMapa.getElementById("AtaqueMarIn").style.display = null;
	//console.log(estados);
}
function obterEstado(argSigla) {
	return estados.find(estado => estado.id === argSigla);
}
function obterJogador(argSigla) {
	return jogadores.find(jogador => jogador.id === argSigla);
}
function definirJogador(argJogador=null) {
	jogador = obterJogador(argJogador);
	if (jogador!=null) {
		jogador.cpu = false;
		jogador.usuario = "AAAAA";
		estadoJogador = obterEstado(jogador.id);
		numAcoesMax = 1;
		divBarraSuperior.style.borderColor = estadoJogador.cor;
		divBarraSuperior.style.backgroundImage = "url('estrutura/" + estadoJogador.imagem + "')";
		divBarraInferior.style.borderColor = estadoJogador.cor;
		divBarraInferior.style.backgroundImage = "url('estrutura/" + estadoJogador.imagem + "')";
		divAcoes.style.borderColor = estadoJogador.cor;
		divAcoes.style.backgroundColor = estadoJogador.cor;

		atualizarBarraStatus();
		
		atualizarQuantidadeDeAcoes();

		logExecucao("Você está jogando como: " + estadoJogador.nome + " (" + estadoJogador.id + ")");
	} else {
		numAcoesMax = 0;
	}
}
function atualizarBarraStatus() {
	imagemJogador.src = "estrutura/" + estadoJogador.imagem;
	imagemJogador.classList.add("bandeira");
	let texto = "";
	const estadosControlados = estados.filter(estado => estado.controlador === jogador).length;
	const vidaTotal = estados.filter(estado => estado.controlador === jogador)
								.reduce((total, estado) => total + estado.vida, 0);
	texto += `${estadoJogador.nome} | Estados controlados: ${estadosControlados} (${vidaTotal})`;
	pJogador.innerHTML = texto;
}
function hslToHex(h,s,l,debug=false) {
	// Must be fractions of 1
	s /= 100;
	l /= 100;

	let c = (1 - Math.abs(2 * l - 1)) * s,
		x = c * (1 - Math.abs((h / 60) % 2 - 1)),
		m = l - c/2,
		r = 0,
		g = 0,
		b = 0;
  
	if (0 <= h && h < 60) {
	  r = c; g = x; b = 0;  
	} else if (60 <= h && h < 120) {
	  r = x; g = c; b = 0;
	} else if (120 <= h && h < 180) {
	  r = 0; g = c; b = x;
	} else if (180 <= h && h < 240) {
	  r = 0; g = x; b = c;
	} else if (240 <= h && h < 300) {
	  r = x; g = 0; b = c;
	} else if (300 <= h && h < 360) {
	  r = c; g = 0; b = x;
	}
	r = parseInt(Math.round((r + m) * 255));
	g = parseInt(Math.round((g + m) * 255));
	b = parseInt(Math.round((b + m) * 255));

	if (debug) {
		console.log(h + ", " + s + ", " + l);
		console.log(r + ", " + g + ", " + b);
	}
  
	return "#" +
		r.toString(16).padStart(2,"0") +
		g.toString(16).padStart(2,"0") +
		b.toString(16).padStart(2,"0");
}
function clicarEstado(argEstado) {
	if (gameState != gameStates.AGUARDAR) {
		if (gameState == gameStates.ESTADOSELECIONADO) {
			if (estadoSelecionado!=null) {
				estadoSelecionado.svg.classList.remove("selecao");
				estadoSelecionado = null;
			}
		}
		estadoSelecionadoAntes = estadoSelecionado;
		estadoSelecionado = argEstado;
		definirGameState(gameStates.ESTADOSELECIONADO);
	}
}
function definirGameState(argGameState,argVoltar = false) {
	switch (argGameState) {
		case gameStates.STANDBY: {
			if (estadoSelecionado!=null) {
				estadoSelecionado.svg.classList.remove("selecao");
				estadoSelecionado = null;
			}
			spanStatus.innerHTML = "Clique em um estado";
			let botoes = divBotoesAcoes.getElementsByTagName("button");
			for (let botao of botoes) {
				botao.disabled = true;
			}
			botaoRodarTurno.disabled = false;
			botaoRodarTurno.innerHTML = "RODAR TURNO";
		} break;
		case gameStates.ESTADOSELECIONADO: {
			if ((gameState == gameStates.ATACARESTADO)
			|| (gameState == gameStates.CONSTRUIRMURO)) {
				if (argVoltar) {
					divBotoesAcoes.classList.remove("cancelar");
					estadoSelecionado.vizinhos.forEach(vizinho => {
						vizinho.svg.classList.remove("atacar");
						vizinho.svg.classList.remove("murar");
					});
				} else {
					let ataquePorAgua = false;
					if (!estadoSelecionadoAntes.vizinhos.includes(estadoSelecionado)) {
						if (gameState == gameStates.ATACARESTADO && estadoSelecionadoAntes.acessoAgua && estadoSelecionado.acessoAgua) {
							ataquePorAgua = true;
						} else {
							alert("O território selecionado não é acessível por este território.");
							estadoSelecionado = estadoSelecionadoAntes;
							return;
						}
					}
					if ((estadoSelecionadoAntes.controlador === estadoSelecionado.controlador)
						&& (gameState == gameStates.ATACARESTADO)) {
						alert("Não se pode atacar seu próprio território!");
						estadoSelecionado = estadoSelecionadoAntes;
						return;
					}
					if (gameState == gameStates.CONSTRUIRMURO) {
						if (muros.some(muro => 
							(muro.estado1 === estadoSelecionadoAntes && muro.estado2 === estadoSelecionado) || 
							(muro.estado1 === estadoSelecionado && muro.estado2 === estadoSelecionadoAntes))) {
							alert("Já existe um muro entre esses territórios!");
							estadoSelecionado = estadoSelecionadoAntes;
							return;
						}
					}
					let tipoAcao = null;
					switch (gameState) {
						case gameStates.ATACARESTADO: tipoAcao = tiposAcoes.ATAQUE; break;
						case gameStates.CONSTRUIRMURO: tipoAcao = tiposAcoes.DEFESA; break;
					}
					let acaoExistente = acoes.find(acao => 
						acao.origem.id === estadoSelecionadoAntes.id && 
						acao.tipo === tipoAcao && 
						(acao.destino ? acao.destino.id === estadoSelecionado.id : true)
					);
					if (acaoExistente) {
						alert("Essa ação já existe!");
						estadoSelecionado = estadoSelecionadoAntes;
						return;
					}
					divBotoesAcoes.classList.remove("cancelar");
					new Acao(estadoSelecionadoAntes,tipoAcao,estadoSelecionado,ataquePorAgua);
					estadoSelecionadoAntes.vizinhos.forEach(vizinho => {
						vizinho.svg.classList.remove("atacar");
						vizinho.svg.classList.remove("murar");
					});
					if (estadoSelecionado.acessoAgua) {
						estados.forEach(estado => {
							if (estado.acessoAgua) {
								estado.svg.classList.remove("atacar");
							}
						});
					}
					estadoSelecionado = estadoSelecionadoAntes;
					definirGameState(gameStates.STANDBY,true);
					return;
				}
			} else {
				estadoSelecionado.svg.classList.add("selecao");
			}
			spanStatus.innerHTML="";
			
			let textoLocal = null;
			textoLocal = document.createElement("p");
			textoLocal.innerHTML = estadoSelecionado.nome + " <img class='bandeira' src='estrutura/" + estadoSelecionado.imagem + "' title='" + estadoSelecionado.nome + "'>";
			spanStatus.appendChild(textoLocal);

			textoLocal = document.createElement("p");
			textoLocal.innerHTML = "Controlado por: <img class='bandeira' src='estrutura/" + estadoSelecionado.controlador.imagem + "' title='" + estadoSelecionado.controlador.nome + "'>";
			spanStatus.appendChild(textoLocal);

			textoLocal = document.createElement("p");
			textoLocal.innerHTML = "Vidas: " + "♥".repeat(estadoSelecionado.vida);
			spanStatus.appendChild(textoLocal);

			textoLocal = document.createElement("p");
			textoLocal.innerHTML = `Acesso ao mar: ${estadoSelecionado.acessoAgua ? "Sim" : "Não"}`;
			spanStatus.appendChild(textoLocal);

			textoLocal = document.createElement("p");
			textoLocal.innerHTML = "Vizinhos: ";
			estadoSelecionado.vizinhos.forEach(vizinho => {
				let imgVizinho = document.createElement("img");
				imgVizinho.src = "estrutura/" + vizinho.imagem;
				imgVizinho.classList.add("bandeira");
				imgVizinho.title = vizinho.nome;
				textoLocal.appendChild(imgVizinho);
			});
			spanStatus.appendChild(textoLocal);
			
			


			if (estadoSelecionado.controlador==jogador) {
				let botoes = divBotoesAcoes.getElementsByTagName("button");
				if (numAcoesMax - numAcoes > 0) {
					for (let botao of botoes) {
						botao.disabled = false;
					}
				}
			} else {
				let botoes = divBotoesAcoes.getElementsByTagName("button");
				for (let botao of botoes) {
					botao.disabled = true;
				}
			}
		} break;
		case gameStates.ATACARESTADO: {
			divBotoesAcoes.classList.add("cancelar");
			estadoSelecionado.vizinhos.forEach(vizinho => {
				if (vizinho.controlador != jogador) {
					vizinho.svg.classList.add("atacar");
				}
			});
			if (estadoSelecionado.acessoAgua) {
				estados.forEach(estado => {
					if (estado.acessoAgua) {
						estado.svg.classList.add("atacar");
					}
				});
			}
		} break;
		case gameStates.CONSTRUIRMURO: {
			divBotoesAcoes.classList.add("cancelar");
			estadoSelecionado.vizinhos.forEach(vizinho => {
				vizinho.svg.classList.add("murar");
			});
		} break;
		case gameStates.AGUARDAR: {
			if (estadoSelecionado!=null) {
				estadoSelecionado.svg.classList.remove("selecao");
				estadoSelecionado = null;
			}
			spanStatus.innerHTML = "Turno em andamento";
			let botoes = divBotoesAcoes.getElementsByTagName("button");
			for (let botao of botoes) {
				botao.disabled = true;
			}
			botaoRodarTurno.disabled = true;
			botaoRodarTurno.innerHTML = "AGUARDE...";
		}
	}
	gameState = argGameState;
}
function atualizarQuantidadeDeAcoes() {
	const vidaTotal = estados.filter(estado => estado.controlador === jogador)
							 .reduce((total, estado) => total + estado.vida, 0);
	numAcoes = acoes.filter(acao => acao.controlador === jogador).length;
	numAcoesMax = Math.ceil((vidaTotal)/qtdAmpliaAcoes);
	spanNumAcoes.innerHTML = "Ações disponíveis: " + (numAcoesMax - numAcoes);
}
function acaoReforcar() {
	if (estadoSelecionado.vida >= 3) {
		alert("O estado já está com a vida máxima.");
		return;
	}
	divBotoesAcoes.classList.remove("cancelar");
	new Acao(estadoSelecionado,tiposAcoes.REFORCO);
	definirGameState(gameStates.STANDBY,true);
}
function acaoAtacar() {
	definirGameState(gameStates.ATACARESTADO);
}
function acaoConstruir() {
	definirGameState(gameStates.CONSTRUIRMURO);
}
function acaoCancelar() {
	definirGameState(gameStates.ESTADOSELECIONADO,true);
}
function rodarTurno() {
	if (numAcoesMax - numAcoes > 0) {
		const proceed = confirm("Você ainda tem ações disponíveis. Deseja prosseguir com o turno?");
		if (!proceed) {
			definirGameState(gameStates.STANDBY);
			return;
		}
	}
	logExecucao(`Turno: ${dataTurno.toLocaleString('default', { month: 'long' })} de ${dataTurno.getFullYear()}`);
	definirGameState(gameStates.AGUARDAR);
	etapasTurnos = etapaTurno();
	intervalosTurnos = setInterval(()=>{
		etapasTurnos.next();
	}, tempoTurnos);

}
function* etapaTurno() {
	executarCPUs();

	acoes = acoes.sort(() => Math.random() - 0.5);
	divListaAcoes.innerHTML = "";
	acoes.forEach(acao => {
		divListaAcoes.appendChild(acao.el);
	});

	for (let i = 0; i < acoes.length; i++) {
		if (acoes[i].executar()) {
			acoes[i].origem.svg.classList.add("destacar1");
			if (acoes[i].destino != null) {
				acoes[i].destino.svg.classList.add("destacar2");
			}
			acoes[i].el.classList.add("executando");
			acoes[i].el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			atualizarBarraStatus();
			yield;
			acoes[i].el.classList.remove("executando");
			acoes[i].origem.svg.classList.remove("destacar1");
			if (acoes[i].destino != null) {
				acoes[i].destino.svg.classList.remove("destacar2");
			}
		}
	}

	verificarJogadores();

	acoes.filter(acao => acao.excluir).forEach(acao => acao.apagar());

	dataTurno.setMonth(dataTurno.getMonth() + 1);
	pturno.innerHTML = `${dataTurno.toLocaleString('default', { month: 'long' }).charAt(0).toUpperCase() + dataTurno.toLocaleString('default', { month: 'long' }).slice(1)} de ${dataTurno.getFullYear()}`;
	logExecucao(`Rodada de preparo: ${dataTurno.toLocaleString('default', { month: 'long' })} de ${dataTurno.getFullYear()}`);
	definirGameState(gameStates.STANDBY);
	zoomMapa(0);
	atualizarQuantidadeDeAcoes();
	clearInterval(intervalosTurnos);
}
function executarCPUs() {
	logExecucao("Silêncio... O computador está pensando...");
	jogadores.forEach(jogadorCPU => {
		if (jogadorCPU.cpu && !jogadorCPU.derrotado) {
			const estadosControlados = estados.filter(estado => estado.controlador === jogadorCPU);
			const vidaTotal = estadosControlados.reduce((total, estado) => total + estado.vida, 0);
			const numAcoesMax = Math.ceil(vidaTotal / qtdAmpliaAcoes);
			let numAcoes = 0;
			let iteracoes = 0;

			while (numAcoes < numAcoesMax) {
				if (iteracoes > 10) {
					break;
				}
				const tipoAcao = Object.values(tiposAcoes)[Math.floor(Math.random() * Object.values(tiposAcoes).length)];
				const estadoOrigem = estadosControlados[Math.floor(Math.random() * estadosControlados.length)];

				if (tipoAcao === tiposAcoes.REFORCO && estadoOrigem.vida < 3) {
					new Acao(estadoOrigem, tiposAcoes.REFORCO);
					numAcoes++;
					iteracoes = 0;
				} else if (tipoAcao === tiposAcoes.ATAQUE) {
					let estadoDestino = estadoOrigem.vizinhos[Math.floor(Math.random() * estadoOrigem.vizinhos.length)];

					if (estadoOrigem.acessoAgua) {
						const estadosComAcessoAoMar = estados.filter(estado => estado.acessoAgua && estado !== estadoOrigem);
						const todosEstadosPossiveis = [...estadoOrigem.vizinhos, ...estadosComAcessoAoMar];
						estadoDestino = todosEstadosPossiveis[Math.floor(Math.random() * todosEstadosPossiveis.length)];
					}

					if (estadoDestino.controlador !== jogadorCPU) {
						let ataquePorAgua = false;
						if (!estadoOrigem.vizinhos.includes(estadoDestino)) {
							ataquePorAgua = true;
						}
						new Acao(estadoOrigem, tiposAcoes.ATAQUE, estadoDestino, ataquePorAgua);
						numAcoes++;
						iteracoes = 0;
					}
				} else if (tipoAcao === tiposAcoes.DEFESA) {
					const estadoDestino = estadoOrigem.vizinhos[Math.floor(Math.random() * estadoOrigem.vizinhos.length)];
					if (!muros.some(muro => 
						(muro.estado1 === estadoOrigem && muro.estado2 === estadoDestino) || 
						(muro.estado1 === estadoDestino && muro.estado2 === estadoOrigem))) {
						new Acao(estadoOrigem, tiposAcoes.DEFESA, estadoDestino);
						numAcoes++;
						iteracoes = 0;
					}
				}
				iteracoes++;
			}
		}
	});
}
function verificarJogadores() {
	jogadores.forEach(jogador => {
		if (!jogador.derrotado) {
			const estadosControlados = estados.filter(estado => estado.controlador === jogador).length;
			if (estadosControlados === 0) {
				jogador.perder();
			}
		}
	});
}
function logExecucao(argTexto) {
	let novoLog = document.createElement("div");
	novoLog.classList.add("log");

	let horario = document.createElement("p");
	horario.classList.add("horario");
	let now = new Date();
	horario.innerHTML = now.toLocaleString().replace(",","<br>");

	let texto = document.createElement("p");
	texto.innerHTML=argTexto;

	novoLog.appendChild(horario);
	novoLog.appendChild(texto);
	divBarraInferior.appendChild(novoLog);
	novoLog.scrollIntoView({ behavior: 'smooth' });
	return novoLog;
}
//#endregion





//#region Inicialização
async function inicializar() {
	console.log("Inicializando...");
	inicializado = true;
	svgMapa = await svgMapaObject.contentDocument.documentElement;
	await iniciarEstados();
	definirGameState(gameStates.STANDBY);
	divBarraInferior.innerHTML="";
	logExecucao("Bem-vindo ao GuerraTaticaBR!");
	pturno.innerHTML = `${dataTurno.toLocaleString('default', { month: 'long' }).charAt(0).toUpperCase() + dataTurno.toLocaleString('default', { month: 'long' }).slice(1)} de ${dataTurno.getFullYear()}`;
	logExecucao(`Rodada de preparo: ${dataTurno.toLocaleString('default', { month: 'long' })} de ${dataTurno.getFullYear()}`);
	zoomMapa(0);
	console.log("Jogo pronto!");
	dialogEscolhaJogador.showModal();
	//new Acao(estados[4],tiposAcoes.ATAQUE,estados[8]);
}
console.log("Carregado");
var carregarConteudo = setInterval((e)=>{
	if (svgMapaObject.contentDocument.readyState === 'complete' && !inicializado) {
		inicializar();
		clearTimeout(carregarConteudo);
	} else {
		console.log("Aguardando...");
	}
}, 100);
//#endregion