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
const dialogMultijogador = document.getElementById("dialogMultijogador");
const dialogLobby = document.getElementById("dialogLobby");
const dialogPrincipal = document.getElementById("dialogPrincipal");
const divOverlayMapa = document.getElementById("overlayMapa");
const divOverlayRanking = document.getElementById("overlayRanking");
const divOverlayAviso = document.getElementById("overlayAviso");
const divTitulo = document.getElementById("titulo");
const pLoader = document.getElementById("loader");
const selectTerritorioMP = document.getElementById("selectTerritorioMP");
const imagemJogadorMP = document.getElementById("imagemJogadorMP");
const nomeJogadorMP = document.getElementById("nomeJogadorMP");

const gameStates = {
	STANDBY: "STANDBY",
	ESTADOSELECIONADO: "ESTADOSELECIONADO",
	ATACARESTADO: "ATACARESTADO",
	CONSTRUIRMURO: "CONSTRUIRMURO",
	AGUARDAR: "AGUARDAR",
	LOBBY: "LOBBY",
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
var numTerritoriosConquistadosJogador = 0;
var numTerritoriosPerdidosJogador = 0;

var dataTurno = new Date(new Date().getFullYear() + 2, 0, 1);
var etapasTurnos = null;
var intervalosTurnos = null;
var tempoTurnos = 2000;
var acelerar = false;
var iteracoesPausa = 0;
var numTurnos = 0;
var autoRodar = false;

var multiplayer = false;
var mp_servidor = "teste";
var mp_porta = 12346
var mp_id = 0;
var socket = null;
var mp_pronto = false;
var mp_territorio = "";

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
		if (this.origem.controlador == jogador) {
			this.el.classList.add("doJogador");
		} else if (this.destino!=null) {
			if (this.destino.controlador == jogador) {
				this.el.classList.add("aoJogador");
			}
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
					if (this.acelerar) {
						this.origem.atualizarSVG();
					} else {
						setTimeout((e)=>{
							this.origem.atualizarSVG();
						},1100);
					}
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
							if (this.acelerar) {
								this.destino.atualizarSVG();
							} else {
								setTimeout((e)=>{
									this.destino.atualizarSVG();
								},1100);
							}
							logExecucao("Ataque " + (this.agua ? "marítimo " : "") + "do território de " + this.origem.nome + " ao território de " + this.destino.nome + " sob controle de " + this.destino.controlador.nome + ".", this.origem.controlador);
						}
					}
					if (this.destino.vida == 0) {
						this.destino.vida = 1;
						if (this.origem.controlador == jogador) {
							numTerritoriosConquistadosJogador++;
						}
						if (this.destino.controlador == jogador) {
							numTerritoriosPerdidosJogador++;
						}
						this.destino.atualizarControlador(this.origem.controlador);
						logExecucao("O território de " + this.destino.nome + " foi conquistado por " + this.origem.controlador.nome + ".",this.origem.controlador);
						acoes.filter(acao => acao.origem === this.destino).forEach(acao => acao.invalidar());
						//verificarJogadores();
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
		this.svg.style.animation = "animMuro 2s forwards";
		muros.push(this);
	}
	destruirMuro() {
		this.svg.style.animation = "animMuroDestroi 2s forwards";
		const index = muros.indexOf(this);
		if (index > -1) {
			muros.splice(index, 1);
		}
		setTimeout((e)=>{
			this.svg.style.display = "none";
		},tempoTurnos);
	}
}
var jogadores = [];
class Jogador {
	constructor(argId,argNome,argSVGId,argCorMatiz,argCorSaturacao,argUsuario = null) {
		this.id = argId;
		this.nome = argNome;
		this.nomeEstado = argNome;
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
		this.nomeEscolhaJogador.innerHTML = this.nomeEstado;
		this.botaoEscolhaJogador.appendChild(this.imagemEscolhaJogador);
		this.botaoEscolhaJogador.appendChild(this.nomeEscolhaJogador);
		divListaTerritoriosJogadores.appendChild(this.botaoEscolhaJogador);

		this.divJogadorLobby = null;
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
	svgMapaObject.style.left = mapaPosX + "px";
	svgMapaObject.style.top = mapaPosY + "px";
}
function zoomMapa(argZoom = 0) {
	if (argZoom === -0) {
		let mapaWidth = svgMapaObject.clientWidth;
		let mapaHeight = svgMapaObject.clientHeight;
		let parentWidth = divMapa.clientWidth;
		let parentHeight = divMapa.clientHeight;
		let scaleX = parentWidth / mapaWidth;
		let scaleY = parentHeight / mapaHeight;

		let novoZoom = Math.min(scaleX, scaleY);
		mapaEscala = novoZoom;
		let posX = ((mapaWidth * novoZoom) / 2) - (divMapa.clientWidth / 2);
		let posY = ((mapaHeight * novoZoom) / 2) - (divMapa.clientHeight / 2);;
		moverMapa(-posX, -posY, false);
	} else {
		mapaEscala = argZoom;
	}
	svgMapaObject.style.transform = `scale(${mapaEscala}) rotateX(${mapaRotX}deg)`;
}
function focarEstado(argEstado) {
	if (!acelerar) {
		let estadoBBox = argEstado.svg.getBBox();
		let mapaBBox = svgMapa.getBBox();
		let estadoBBoxN = {
			x: (estadoBBox.x / mapaBBox.width) * svgMapaObject.offsetWidth,
			y: (estadoBBox.y / mapaBBox.height) * svgMapaObject.offsetHeight,
			width: (estadoBBox.width / mapaBBox.width) * svgMapaObject.offsetWidth,
			height: (estadoBBox.height / mapaBBox.height) * svgMapaObject.offsetHeight
		};
		let scaleX = divMapa.clientWidth / estadoBBoxN.width;
		let scaleY = divMapa.clientHeight / estadoBBoxN.height;
		let novoZoom = Math.min(scaleX, scaleY);
		if (novoZoom > 2) {
			novoZoom = 2;
		}
		zoomMapa(novoZoom);
		let posX = (estadoBBoxN.x * novoZoom) + ((estadoBBoxN.width * novoZoom) / 2) - (divMapa.clientWidth / 2);
		let posY = (estadoBBoxN.y * novoZoom) + ((estadoBBoxN.height * novoZoom) / 2) - (divMapa.clientHeight / 2);;
		//console.log(posX);
		moverMapa(-posX, -posY, false);
	}
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
			let svgElementDef = svgMapa.getElementById(`def_${estado.id}-${vizinho.id}`);
			if (svgElementDef==null) {
				svgElementDef = svgMapa.getElementById(`def_${vizinho.id}-${estado.id}`);
				if (svgElementDef==null) {
					console.log("Não achei o ícone de defesa de " + estado.id + " com " + vizinho.id);
				}
			}
			svgElementDef.style.display = "none";
		});
		if (estado.acessoAgua) {
			let svgElementIn = svgMapa.getElementById(`atqMarIn_${estado.id}`);
			let svgElementOut = svgMapa.getElementById(`atqMarOut_${estado.id}`);
			svgElementIn.style.display = "none";
			svgElementOut.style.display = "none";
		}
	});
	svgMapa.getElementById("Defesas").style.display = null;
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
	if (gameState != gameStates.LOBBY) {
		divTitulo.style.display = "none";
	}
	if (jogador!=null) {
		jogador.cpu = false;
		if (!multiplayer) {
			jogador.usuario = "AAAAA";
		}
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
		//console.log(obterJSONEstados());
		//console.log(obterHashEstados());
	} else {
		numAcoesMax = 0;
	}
}
function atualizarBarraStatus() {
	if (jogador == null) {
		imagemJogador.style.display = "none";
		pJogador.innerHTML = "Guerra Tática BR";
	} else {
		imagemJogador.style.display = null;
		imagemJogador.src = "estrutura/" + jogador.imagem;
		imagemJogador.classList.add("bandeira");
		let texto = "";
		const estadosControlados = estados.filter(estado => estado.controlador === jogador).length;
		const vidaTotal = estados.filter(estado => estado.controlador === jogador)
									.reduce((total, estado) => total + estado.vida, 0);
		texto += `${estadoJogador.nome} | Estados controlados: ${estadosControlados} (${vidaTotal})`;
		pJogador.innerHTML = texto;
	}
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
					if (estadoSelecionado.acessoAgua) {
						estados.forEach(estado => {
							if (estado.acessoAgua && estado.controlador!=estadoSelecionado.controlador) {
								estado.svg.classList.remove("atacar");
							}
						});
					}
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
					if (multiplayer) {
						let mensagem = `\\action ${estadoSelecionadoAntes.id} ${tipoAcao.toUpperCase()} ${estadoSelecionado.id} ${ataquePorAgua}`;
						socket.send(mensagem);
					}
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
					if (estado.acessoAgua && estado.controlador!=estadoSelecionado.controlador) {
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
			divBotoesAcoes.classList.remove("cancelar");
			estados.forEach(estado => {
				estado.svg.classList.remove("atacar", "murar", "selecao");
			});
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
	if (multiplayer) {
		let mensagem = `\\action ${estadoSelecionado.id} ${tiposAcoes.REFORCO.toUpperCase()}`;
		socket.send(mensagem);
	}
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
	if (multiplayer) {
		logExecucao("Aguardando os demais jogadores...");
		definirGameState(gameStates.AGUARDAR);
		socket.send("\\ready");
	} else {
		logExecucao(`Turno: ${dataTurno.toLocaleString('default', { month: 'long' })} de ${dataTurno.getFullYear()}`);
		definirGameState(gameStates.AGUARDAR);
		etapasTurnos = etapaTurno();
		exibirOverlayInicio();
		numTurnos++;
		intervalosTurnos = setInterval(()=>{
			etapasTurnos.next();
		}, tempoTurnos);
	}

}
function* etapaTurno() {
	divListaAcoes.innerHTML = "";
	if (!multiplayer) {
		executarCPUs();

		acoes = acoes.sort(() => Math.random() - 0.5);
	}
	acoes.forEach(acao => {
		divListaAcoes.appendChild(acao.el);
	});

	for (let i = 0; i < acoes.length; i++) {
		if (acoes[i].executar()) {
			acoes[i].origem.svg.classList.add("destacar1");
			if (acoes[i].tipo == tiposAcoes.ATAQUE) {
				acoes[i].destino.svg.classList.add("destacar2");
			}
			acoes[i].el.classList.add("executando");
			acoes[i].el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			atualizarBarraStatus();
			atualizarOverlayRanking();
			yield;
			verificarJogadores();
			for (let j = 0; j < iteracoesPausa; j++) {
				yield;
			}
			iteracoesPausa = 0;
			acoes[i].el.classList.remove("executando");
			acoes[i].origem.svg.classList.remove("destacar1");
			if (acoes[i].tipo == tiposAcoes.ATAQUE) {
				acoes[i].destino.svg.classList.remove("destacar2");
			}
		}
	}

	acoes.filter(acao => acao.excluir).forEach(acao => acao.apagar());

	dataTurno.setMonth(dataTurno.getMonth() + 1);
	pturno.innerHTML = `${dataTurno.toLocaleString('default', { month: 'long' }).charAt(0).toUpperCase() + dataTurno.toLocaleString('default', { month: 'long' }).slice(1)} de ${dataTurno.getFullYear()}`;
	logExecucao(`Rodada de preparo: ${dataTurno.toLocaleString('default', { month: 'long' })} de ${dataTurno.getFullYear()}`);
	definirGameState(gameStates.STANDBY);
	zoomMapa(0);
	if (multiplayer) {
		socket.send("\\ready");
	}
	atualizarQuantidadeDeAcoes();
	clearInterval(intervalosTurnos);
	if (autoRodar) {
		rodarTurno();
	}
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
	jogadores.forEach(jogadorVerificar => {
		if (!jogadorVerificar.derrotado) {
			const estadosControlados = estados.filter(estado => estado.controlador === jogadorVerificar).length;
			if (estadosControlados === 0) {
				jogadorVerificar.perder();
				exibirOverlayDerrota(jogadorVerificar);
				if (jogadorVerificar === jogador) {
					clearInterval(intervalosTurnos);
					setTimeout((e)=>{
						exibirOverlayJogadorPerdeu();
					}, (tempoTurnos * iteracoesPausa) + 100);
				}
			}
		}
	});
	const jogadoresAtivos = jogadores.filter(jogador => !jogador.derrotado);
	if (jogadoresAtivos.length === 1) {
		clearInterval(intervalosTurnos);
		setTimeout((e)=>{
			exibirOverlayVencedor();
		}, (tempoTurnos * iteracoesPausa) + 100);
	}
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
function atualizarOverlayRanking() {
	const jogadoresAtivos = jogadores.filter(jogador => !jogador.derrotado);
	const ranking = jogadoresAtivos.map(jogador => {
		const vidas = estados.filter(estado => estado.controlador === jogador)
							 .reduce((total, estado) => total + estado.vida, 0);
		return { jogador, vidas };
	}).sort((a, b) => b.vidas - a.vidas);

	divOverlayRanking.innerHTML = "";
	ranking.forEach(entry => {
		const p = document.createElement("p");
		const img = document.createElement("img");
		img.src = "estrutura/" + entry.jogador.imagem;
		img.classList.add("bandeira");
		img.title = entry.jogador.nome;
		p.appendChild(img);
		p.innerHTML += ` ${entry.jogador.nome}: ${entry.vidas}`;
		divOverlayRanking.appendChild(p);
	});
}
function exibirOverlayDerrota(argJogador) {
	divOverlayAviso.style.display = "none";
	divOverlayAviso.classList.add("derrota");
	iteracoesPausa = 2;
	const h1 = document.createElement("h1");
	h1.innerHTML = `${argJogador.nome} foi derrotado!`;

	const img = document.createElement("img");
	img.style.height = "100px";
	img.src = "estrutura/" + argJogador.imagem;
	img.title = argJogador.nome;

	divOverlayAviso.innerHTML = "";
	divOverlayAviso.appendChild(h1);
	divOverlayAviso.appendChild(img);
	divOverlayAviso.style.animation = `animAviso ${tempoTurnos * iteracoesPausa / 2000}s ease-in-out alternate 2`;
	divOverlayAviso.style.display = "block";
	setTimeout((e)=>{
		divOverlayAviso.style.display = "none";
		divOverlayAviso.classList.remove("derrota");
	}, tempoTurnos * iteracoesPausa);
}
function exibirOverlayInicio() {
	divOverlayAviso.style.display = "none";
	divOverlayAviso.classList.add("informe");
	const h1 = document.createElement("h1");
	h1.innerHTML = `${dataTurno.toLocaleString('default', { month: 'long' }).charAt(0).toUpperCase() + dataTurno.toLocaleString('default', { month: 'long' }).slice(1)} de ${dataTurno.getFullYear()}`;

	divOverlayAviso.innerHTML = "";
	divOverlayAviso.appendChild(h1);
	divOverlayAviso.style.animation = "animAviso 1s ease-in-out alternate 2";
	divOverlayAviso.style.display = "block";
	setTimeout((e)=>{
		divOverlayAviso.style.display = "none";
		divOverlayAviso.classList.remove("informe");
	}, 2000);
}
function exibirOverlayJogadorPerdeu() {
	divOverlayAviso.style.display = "none";
	divOverlayAviso.classList.add("derrota");
	divOverlayAviso.classList.add("jogador");

	const h1 = document.createElement("h1");
	h1.innerHTML = "Você foi derrotado!";

	const sumario = exibirSumarioPartida();

	const btnVerFinal = document.createElement("button");
	btnVerFinal.innerHTML = "Ver Final da Partida";
	btnVerFinal.onclick = () => {
		divOverlayAviso.style.animation = null;
		divOverlayAviso.classList.remove("derrota");
		divOverlayAviso.classList.remove("jogador");
		divOverlayAviso.style.display = "none";
		tempoTurnos = 200;
		zoomMapa(0);
		acelerar = true;
		autoRodar = true;
		intervalosTurnos = setInterval(()=>{
			etapasTurnos.next();
		}, tempoTurnos);
	};

	const btnReiniciar = document.createElement("button");
	btnReiniciar.innerHTML = "Reiniciar";
	btnReiniciar.onclick = () => {
		location.reload();
	};

	divOverlayAviso.innerHTML = "";
	divOverlayAviso.appendChild(h1);
	divOverlayAviso.appendChild(sumario);
	divOverlayAviso.appendChild(btnVerFinal);
	divOverlayAviso.appendChild(btnReiniciar);
	divOverlayAviso.style.animation = "animAviso 1.5s ease-in-out forwards 1";
	divOverlayAviso.style.pointerEvents = "all";
	divOverlayAviso.style.display = "block";
}
function exibirOverlayVencedor() {
	const vencedor = jogadores.find(jogador => !jogador.derrotado);

	divOverlayAviso.style.display = "none";
	divOverlayAviso.classList.add("vitoria");

	const h1 = document.createElement("h1");
	h1.innerHTML = `${vencedor.nome} venceu a partida!`;

	const img = document.createElement("img");
	img.style.height = "100px";
	img.src = "estrutura/" + vencedor.imagem;
	img.title = vencedor.nome;

	const sumario = exibirSumarioPartida();

	const btnReiniciar = document.createElement("button");
	btnReiniciar.innerHTML = "Reiniciar";
	btnReiniciar.onclick = () => {
		location.reload();
	};

	divOverlayAviso.innerHTML = "";
	divOverlayAviso.appendChild(h1);
	divOverlayAviso.appendChild(img);
	divOverlayAviso.appendChild(sumario);
	divOverlayAviso.appendChild(btnReiniciar);
	divOverlayAviso.style.animation = "animAviso 1.5s ease-in-out forwards 1";
	divOverlayAviso.style.pointerEvents = "all";
	divOverlayAviso.style.display = "block";
}
function exibirSumarioPartida() {
	const divSumario = document.createElement("div");
	divSumario.classList.add("sumario");

	const titulo = document.createElement("h2");
	titulo.innerHTML = "Resumo da Partida";
	divSumario.appendChild(titulo);

	const turnos = document.createElement("p");
	turnos.innerHTML = `Turnos rodados: ${numTurnos}`;
	divSumario.appendChild(turnos);

	const conquistas = document.createElement("p");
	conquistas.innerHTML = `Territórios conquistados: ${numTerritoriosConquistadosJogador}`;
	divSumario.appendChild(conquistas);

	const perdas = document.createElement("p");
	perdas.innerHTML = `Territórios perdidos: ${numTerritoriosPerdidosJogador}`;
	divSumario.appendChild(perdas);

	return divSumario;
}
//#endregion





//#region Multiplayer
function obterJSONEstados() {
    let estadoData = estados.map(estado => ({
        id: estado.id,
        //nome: estado.nome,
        vida: estado.vida,
        //corMatiz: estado.corMatiz,
        //corSaturacao: estado.corSaturacao,
        //cor: estado.cor,
        //acessoAgua: estado.acessoAgua,
        controlador: estado.controlador.id,
        //vizinhos: estado.vizinhos.map(vizinho => vizinho.id)
    }));
    
    let jsonEstados = JSON.stringify(estadoData, (key, value) => {
        if (typeof value === 'string') {
            return value.replace(/[\u00C0-\u017F]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
        }
        return value;
    });
	jsonEstados = jsonEstados.replace(/\\\\/g, '\\');
    
    return jsonEstados;
}
function obterHashEstados() {
	return md5(obterJSONEstados());
}
function entrarSalaIP(servidor = mp_servidor) {
	if (servidor == mp_servidor) {
		mp_servidor = prompt("Informe o endereço do servidor:", mp_servidor);
	} else {
		mp_servidor = servidor;
	}
	const url = `ws://${mp_servidor}:${mp_porta}`;
	socket = new WebSocket(url);

	socket.onopen = function() {
		exibirLobby();
	};

	socket.onmessage = function(event) {
		console.log('SERVIDOR: ' + event.data);
		let jsonServidor = JSON.parse(event.data);
		console.log(jsonServidor);
		switch (jsonServidor.tipo) {
			case "infoServer":
				mp_id = parseInt(jsonServidor.conteudo.resourceId);
				timerPlanejamento = parseInt(jsonServidor.conteudo.timerPlan);
				break;
			case "status": 
				const jogadoresLobby = document.getElementById("jogadoresLobby");
				jogadoresLobby.innerHTML = "";
				atualizarJogadoresServidor(jsonServidor.conteudo.jogadores);
				for (let i = 0; i < jogadores.length; i++) {

					//console.log(jsonServidor.conteudo.jogadores[index]);
					const jogadorMP = jogadores[i];
					if (jogadorMP.usuario !== null) {
						const divJogador = document.createElement("div");
						divJogador.classList.add("jogadorLobby");
						jogadorMP.divJogadorLobby = divJogador;
						
						const imgJogador = document.createElement("img");
						imgJogador.src = "estrutura/" + jogadorMP.imagem;
						imgJogador.classList.add("bandeira");
						imgJogador.title = jogadorMP.id;
						divJogador.appendChild(imgJogador);

						const nomeJogador = document.createElement("span");
						nomeJogador.textContent = jogadorMP.nome;
						divJogador.appendChild(nomeJogador);
						
						jogadoresLobby.appendChild(divJogador);

						if (jogadorMP.usuario === mp_id) {
							selectTerritorioMP.value = jogadorMP.id;
							mp_territorio = jogadorMP.id;
							imagemJogadorMP.src = "estrutura/" + jogadorMP.imagem;
							imagemJogadorMP.title = jogadorMP.nome;
							nomeJogadorMP.value = jogadorMP.nome;
							definirJogador(mp_territorio);
						}
					}
				}
				break;
			case "ready":
				const jogadorPronto = jogadores.find(jogador => jogador.usuario === jsonServidor.conteudo);
				if (jogadorPronto && jogadorPronto.divJogadorLobby) {
					jogadorPronto.divJogadorLobby.style.backgroundColor = "green";
				}
				break;
			case "notReady":
				const jogadorNaoPronto = jogadores.find(jogador => jogador.usuario === jsonServidor.conteudo);
				if (jogadorNaoPronto && jogadorNaoPronto.divJogadorLobby) {
					jogadorNaoPronto.divJogadorLobby.style.backgroundColor = null;
				}
				break;
			case "msg":
				const divMensagem = document.createElement("div");
				divMensagem.classList.add("mensagemChat");

				if (jsonServidor.conteudo.remetente === -1) {
					const textoMensagem = document.createElement("p");
					textoMensagem.textContent = jsonServidor.conteudo.msg;
					divMensagem.appendChild(textoMensagem);
				} else {
					const jogadorMsg = jogadores.find(jogador => jogador.usuario === jsonServidor.conteudo.remetente);

					const imgJogador = document.createElement("img");
					imgJogador.src = "estrutura/" + jogadorMsg.imagem;
					imgJogador.classList.add("bandeira");
					imgJogador.title = jogadorMsg.id;
					divMensagem.appendChild(imgJogador);

					const nomeJogador = document.createElement("span");
					nomeJogador.textContent = jogadorMsg.nome + " diz:";
					divMensagem.appendChild(nomeJogador);

					const textoMensagem = document.createElement("p");
					textoMensagem.textContent = jsonServidor.conteudo.msg;
					divMensagem.appendChild(textoMensagem);
				}

				document.getElementById("chatLobby").appendChild(divMensagem);
				divMensagem.scrollIntoView();
				break;
			case "plan": {
				if (gameState === gameStates.LOBBY) {
					dialogLobby.close();
					divTitulo.style.display = "none";
					multiplayer = true;
					definirJogador(mp_territorio);
				}
				definirGameState(gameStates.STANDBY);
				divBarraInferior.innerHTML="";
				logExecucao("Bem-vindo ao GuerraTaticaBR!");
				pturno.innerHTML = `${dataTurno.toLocaleString('default', { month: 'long' }).charAt(0).toUpperCase() + dataTurno.toLocaleString('default', { month: 'long' }).slice(1)} de ${dataTurno.getFullYear()}`;
				logExecucao(`Rodada de preparo: ${dataTurno.toLocaleString('default', { month: 'long' })} de ${dataTurno.getFullYear()}`);
				console.log("Jogo pronto!");
				atualizarBarraStatus();
				atualizarOverlayRanking();
				divOverlayAviso.style.display = "none";
				zoomMapa(0);
				break;
			}
			case "acoes": {
				acoes.forEach(acao => acao.apagar());
				jsonServidor.conteudo.forEach(acaoData => {
					console.log(acaoData);
					const origem = obterEstado(acaoData.origem);
					const destino = acaoData.destino ? obterEstado(acaoData.destino) : null;
					const tipo = Object.values(tiposAcoes).find(t => t === acaoData.tipo.toLowerCase());
					const agua = acaoData.agua;

					if (origem && tipo) {
						new Acao(origem, tipo, destino, agua);
					}
				});
				logExecucao(`Turno: ${dataTurno.toLocaleString('default', { month: 'long' })} de ${dataTurno.getFullYear()}`);
				definirGameState(gameStates.AGUARDAR);
				etapasTurnos = etapaTurno();
				exibirOverlayInicio();
				numTurnos++;
				intervalosTurnos = setInterval(()=>{
					etapasTurnos.next();
				}, tempoTurnos);
				break;
			}
		}
	};

	socket.onerror = function(error) {
		alert('Erro: ' + error.message);
	};

	socket.onclose = function() {
		window.location.reload();
	};
}
function exibirLobby() {
	definirGameState(gameStates.LOBBY);
	dialogLobby.showModal();
	
	selectTerritorioMP.innerHTML = "";

	jogadores.forEach(jogador => {
		const option = document.createElement("option");
		option.value = jogador.id;
		option.textContent = jogador.nome;
		selectTerritorioMP.appendChild(option);
	});

	selectTerritorioMP.addEventListener("change", (event) => {
		const selectedOption = event.target.value;
		const jogadorSelecionado = jogadores.find(jogador => jogador.id === selectedOption);
		if (jogadorSelecionado) {
			const imagemJogadorMP = document.getElementById("imagemJogadorMP");
			imagemJogadorMP.src = "estrutura/" + jogadorSelecionado.imagem;
			imagemJogadorMP.title = jogadorSelecionado.nome;
			socket.send("\\linkPlayer "+selectedOption);
		}
	});

	nomeJogadorMP.addEventListener("change", (event) => {
		const novoNome = event.target.value.trim();
		if (novoNome !== "" && jogador.nome !== novoNome) {
			socket.send(`\\renamePlayer ${novoNome}`);
		}
	});
}
function enviarMensagemChat() {
	const inputMensagem = document.getElementById("mensagemChatLobby");
	const mensagem = inputMensagem.value.trim();
	if (mensagem !== "") {
		socket.send(mensagem);
		inputMensagem.value = "";
		inputMensagem.focus();

		const divMensagem = document.createElement("div");
		divMensagem.classList.add("mensagemChat");

		const imgJogador = document.createElement("img");
		imgJogador.src = "estrutura/" + jogador.imagem;
		imgJogador.classList.add("bandeira");
		imgJogador.title = jogador.id;
		divMensagem.appendChild(imgJogador);

		const nomeJogador = document.createElement("span");
		nomeJogador.textContent = "Você diz:";
		divMensagem.appendChild(nomeJogador);

		const textoMensagem = document.createElement("p");
		textoMensagem.textContent = mensagem;
		divMensagem.appendChild(textoMensagem);

		document.getElementById("chatLobby").appendChild(divMensagem);
		divMensagem.scrollIntoView();
	}
}
document.getElementById("mensagemChatLobby").addEventListener("keydown", function(event) {
	if (event.key === "Enter") {
		enviarMensagemChat();
	}
});
function sairSala() {

}
function atualizarJogadoresServidor(argJSONJogadores) {
	jogadores.forEach(jogador => {
		const jogadorData = argJSONJogadores.find(j => j.id === jogador.id);
		if (jogadorData) {
			jogador.nome = jogadorData.nome;
			jogador.usuario = jogadorData.jogador;
			jogador.cpu = false;
		} else {
			jogador.nome = jogador.nomeEstado;
			jogador.usuario = null;
			jogador.cpu = true;
		}
	});
}
function mpEstouPronto() {
	mp_pronto = !mp_pronto;
	if (mp_pronto) {
		socket.send("\\ready");
		botaoProntoMP.style.backgroundColor = "green";
	} else {
		socket.send("\\notReady");
		botaoProntoMP.style.backgroundColor = "";
	}
	selectTerritorioMP.disabled = mp_pronto;
	nomeJogadorMP.disabled = mp_pronto;
}
//#endregion





//#region Inicialização
async function inicializar() {
	pLoader.innerHTML = "";
	svgMapa = svgMapaObject.contentDocument.documentElement;
	iniciarEstados();
	//dialogPrincipal.showModal();
	entrarSalaIP("localhost");
	//rodarTurno();
	//exibirOverlayJogadorPerdeu();
}
function iniciarUmJogador() {
	dialogPrincipal.close();
	dialogEscolhaJogador.showModal();
	console.log("Inicializando...");
	inicializado = true;
	
	definirGameState(gameStates.STANDBY);
	divBarraInferior.innerHTML="";
	logExecucao("Bem-vindo ao GuerraTaticaBR!");
	pturno.innerHTML = `${dataTurno.toLocaleString('default', { month: 'long' }).charAt(0).toUpperCase() + dataTurno.toLocaleString('default', { month: 'long' }).slice(1)} de ${dataTurno.getFullYear()}`;
	logExecucao(`Rodada de preparo: ${dataTurno.toLocaleString('default', { month: 'long' })} de ${dataTurno.getFullYear()}`);
	console.log("Jogo pronto!");
	atualizarBarraStatus();
	atualizarOverlayRanking();
	divOverlayAviso.style.display = "none";
	zoomMapa(0);
}
function iniciarMultijogador() {
	dialogPrincipal.close();
	dialogMultijogador.showModal();
}
console.log("Carregado");
var carregarConteudo = setInterval((e)=>{
	if (svgMapaObject.contentDocument.readyState === 'complete' && !inicializado) {
		setTimeout(inicializar,1000);
		clearTimeout(carregarConteudo);
	} else {
		console.log("Aguardando...");
	}
}, 100);
//#endregion