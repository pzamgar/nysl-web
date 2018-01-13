//********************************************************************
// utilidades - funcionalidades ajenas APP
//********************************************************************
var utilidades = (function () {

	var urlJson = 'https://api.myjson.com/bins/85t81';

	var cargarDatosJson = function () {

		$.ajax({
			beforeSend: function (xhr) {
				if (xhr.overrideMimeType) {
					xhr.overrideMimeType("application/json");
				}
			}
		});

		//retornamos la funcion recuperar datos JSON para tratar success/fail...
		return ($.getJSON((urlJson)));
	};

	//Template mustache
	var showTemplate = function (idTemplate, idShow, obj) {
		var template = $(idTemplate).html();
		var html = Mustache.render(template, obj);
		$(idShow).html(html);
	};

	var loadJsonFail = function (idElement) {
		$(idElement).html('Sorry! We could not load the timetable at the moment').css({
			display: 'block'
		}).addClass("col-xs-12 col-sm-6 col-md-6 col-md-offset-1 jumbotron");

	};

	return {
		cargarDatosJson: cargarDatosJson,
		showTemplate: showTemplate,
		loadJsonFail: loadJsonFail
	};

})();

//********************************************************************
// UIController
//********************************************************************
var UIController = (function () {

	var DOMStrings = {
		navBackBtn: '.nav_back__btn',
		headerNav: '.header__nav',
		headerNavBtnclose: '.header__nav--btnclose',
		listGameInfo: '#listGameInfo',
		pageHome: '#page-home',
		pageComment: '#page-comment',
		pageDetailInfo: '#page-detailinfo',
		errorSignIn: '.errorSignIn',
		errorSignUp: '.errorSignUp',
		errorUsrSignUp: '.errorUsrSignUp',
		errorPswSignUp: '.errorPswSignUp',
		errorUsrSignIn: '.errorUsrSignIn',
		errorPswSignIn: '.errorPswSignIn',
		navEditBtn: '.nav__edit-btn',
		myModal: '#myModal',
		modalSignUp: '#modalSignUp',
		newPostMessage: '#new-post-message',
		structGameInfo: '#structGameInfo'
	};

	var DOMEventStrings = {
		signInButton: 'sign-in-button',
		signOutButton: 'sign-out-button',
		nyslSignIn: 'nysl-sign-in',
		nyslSignUp: 'nysl-sign-up',
		modalSignUp: 'modal-signUp',
		editButton: 'edit-button',
		messageForm: 'message-form',
		panelCollapse: '.panel-collapse',
		logoBoxImg: '.logo__box-img',
		headerNavA: '.header__nav a',
		imageHeadingA: '.image__heading a'
	};

	var weekdays = new Array(7);
	weekdays[0] = "Sunday";
	weekdays[1] = "Monday";
	weekdays[2] = "Tuesday";
	weekdays[3] = "Wednesday";
	weekdays[4] = "Thursday";
	weekdays[5] = "Friday";
	weekdays[6] = "Saturday";

	var months = new Array(12);
	months[0] = "Enero";
	months[1] = "Febrero";
	months[2] = "Marzo";
	months[3] = "Abril";
	months[4] = "Mayo";
	months[5] = "Junio";
	months[6] = "Julio";
	months[7] = "Agosto";
	months[8] = "Septiembre";
	months[9] = "Octubre";
	months[10] = "Noviembre";
	months[11] = "Deciembre";

	//Variables control flujo UIController
	let currentUID;
	let listeningFirebaseRefs = [];
	let islogin = false;
	let partido = 1;
	let recentCommentSection;

	//Funciones Privadas
	/****************************************************************************/
	
	//Validar datos del formulario SIGN IN, validar datos basicos
	var validateSignIn = function (email, password, opcio) {

		let error = '';

		//Resest fields formulario
		$(DOMStrings.errorUsrSignUp).html('');
		$(DOMStrings.errorPswSignUp).html('');
		$(DOMStrings.errorUsrSignIn).html('');
		$(DOMStrings.errorPswSignIn).html('');

		//Validar data email --> input
		if (email.length < 6) {
			error = 'Error address mail, minim 6.\n';
			if (opcio === '1') {
				$(DOMStrings.errorUsrSignIn).html(error).css("color", "red");
			} else {
				$(DOMStrings.errorUsrSignUp).html(error).css("color", "red");
			}
		}

		//Validar data password --> input
		if (password.length < 6) {
			error = 'Error password length, minim 6';
			if (opcio === '1') {
				$(DOMStrings.errorPswSignIn).html(error).css("color", "red");
			} else {
				$(DOMStrings.errorPswSignUp).html(error).css("color", "red");
			}
		}

		return error;
	};

	//FIREBASE - Crear elemento BBDD usuario nuevo (GOOGLE SIGN IN)
	var newCommentForCurrentUser = function (objComment) {

		var userId = firebase.auth().currentUser.uid;

		return firebase.database().ref('/users/' + userId).once('value').then(function (snapshot) {
			var username = (snapshot.val() && snapshot.val().username) || (snapshot.val() && snapshot.val().email) || 'Anonymous';
			return writeNewComment(firebase.auth().currentUser.uid, username, firebase.auth().currentUser.photoURL, objComment);
		});

	};

	//FIREBASE - Crear comment CHAT BBDD (1.- COMMENT , 2.- USER-COMMENT)
	var writeNewComment = function (uid, username, picture, objComment) {

		// añadimos campos adicionales usuario del comenatario a la informacion del juego
		date = new Date();
		date = date.getDate() + ' ' + months[date.getMonth()] + ', ' + +date.getHours() + ':' + date.getMinutes();

		objComment.uid = uid;
		objComment.user = username;
		objComment.usrpict = picture;
		objComment.time = date;

		// Get a key for a new Comment.
		var newCommentKey = firebase.database().ref().child('comment').push().key;

		// Write the new comment's data simultaneously in the posts list and the user's post list.
		var updates = {};
		updates['/comment/' + newCommentKey] = objComment;
		updates['/user-comment/' + uid + '/' + newCommentKey] = objComment;

		return firebase.database().ref().update(updates);
	};

	// Renderizamos el comentario en la pagina DETAIL 
	var createCommentElement = function (postId, text, author, authorId, authorPic, time) {

		var uid = firebase.auth().currentUser.uid;

		var html =
			'<div class="comment comment-' + postId + '">' +
			'<div class="comment__header">' +
			'<div class="comment__avatar"></div>' +
			'<div class="comment__username"></div>' +
			'</div>' +
			'<div class="comment__text">' +
			'<p class="comment__text--message"></p>' +
			'</div>' +
			'</div>';

		// Create the DOM element from the HTML.
		var div = document.createElement('div');
		div.innerHTML = html;
		var postElement = div.firstChild;

		//nombre autor comentario + hora creado comment
		author = (author || 'Anonymous') + ' - ' + time;

		// Set values.
		postElement.getElementsByClassName('comment__text--message')[0].innerText = text;
		postElement.getElementsByClassName('comment__username')[0].innerText = author;
		postElement.getElementsByClassName('comment__avatar')[0].style.backgroundImage = 'url("' + (authorPic || 'img/silhouette.jpg') + '")';

		return postElement;
	};

	// Clean seccion commentarios en la page DETAIL
	var cleanupUi = function () {

		// Remove all previously displayed posts.
		recentCommentSection.getElementsByClassName('comments-container')[0].innerHTML = '';

		// Stop all currently listening Firebase listeners.
		listeningFirebaseRefs.forEach(function (ref) {
			ref.off();
		});
		listeningFirebaseRefs = [];

		//Reset campos formulariso SIGN IN/SIGN UP
		document.getElementById('usrname').value = '';
		document.getElementById('psw').value = '';
		document.getElementById('usrSignUp').value = '';
		document.getElementById('pswSignUp').value = '';
	};

	// FIREBASE - Crear nuevo usuario en BBDD
	var writeUserData = function (userId, name, email, imageUrl) {

		firebase.database().ref('users/' + userId).set({
			username: name,
			email: email,
			profile_picture: imageUrl
		});
	};

	//Control de los comentarios obtenidos en BBDD FIREBASE - por partido.
	var startDatabaseQueries = function (gameId) {

		var myUserId = firebase.auth().currentUser.uid;

		var recentPostsRef = firebase.database().ref('comment').limitToLast(100);

		var fetchPosts = function (postsRef, sectionElement) {

			postsRef.orderByChild("gameId").equalTo(gameId).on("child_added", function (data) {

				var author = data.val().user || 'Anonymous';
				var containerElement = sectionElement.getElementsByClassName('comments-container')[0];
				containerElement.insertBefore(
					createCommentElement(data.key, data.val().gameText, author, data.val().uid, data.val().usrpict, data.val().time),
					containerElement.firstChild);
			});
		};

		// Fetching and displaying all posts of each sections.
		fetchPosts(recentPostsRef, recentCommentSection);

		// Keep track of all Firebase refs we are listening to.
		listeningFirebaseRefs.push(recentPostsRef);
	};

	//Mostramos los comments CHATS, si el usuario esta logueado
	var showDetailComment = function (gameId) {

		/* Si estamos logueados mostramos mensajes del Chat */
		if (islogin) {
			cleanupUi();
			startDatabaseQueries(gameId);
			showSection(recentCommentSection);
		}
	};

	var showSection = function (sectionElement) {

		recentCommentSection.style.display = 'none';
		if (sectionElement) {
			sectionElement.style.display = 'block';
		}
	};

	// Decidir en que orientacion (PORTRAIT/LANDSCAPE)
	var applyOrientation = function () {

		let orientation = '';

		if (window.orientation || window.screen.orientation) {

			if (window.matchMedia("(orientation: portrait)").matches) {
				orientation = 'port';
			}
			if (window.matchMedia("(orientation: landscape)").matches) {
				orientation = 'land';
			}
		} else {
			if (window.innerHeight > window.innerWidth) {
				orientation = 'port';
			} else {
				orientation = 'land';
			}
		}

		return (orientation);
	};

	// Renderizar con MUSTACHE - Detalle partido seleccionado
	var showDetailGameList = function (game) {

		let data = GameInfoController.getDataListGame();
		let datGame = data.listGame[game - 1];
		let location = data.listLocalGame[datGame.idLocal - 1];

		//Estructura template detail Game
		let dataGame = {};

		dataGame.name = location.name;
		dataGame.idHome = datGame.idHome;
		dataGame.idVisit = datGame.idVisit;
		dataGame.urlLoc = location.urlLoc;
		dataGame.titleInfoCont = 'Information contact NYSL';
		dataGame.facType = 'Facility Type: ';
		dataGame.facTypeTxt = 'Outdoor';
		dataGame.addInfo = 'Additional Information: ';
		dataGame.addInfoTxt = 'If deemed necessary by NYSL, games may be shortened or cancelled due to extreme weather conditions.';
		dataGame.dirquest = 'Please direct all questions to:';
		dataGame.dirquestTxt = 'Michael Randall, League Coordinator';
		dataGame.labelPhone = 'Phone:';
		dataGame.txtPhone = '(630) 690-8132 ';
		dataGame.labeMail = 'Email: ';
		dataGame.txtMail = 'michael.randall@chisoccer.org';

		utilidades.showTemplate('#detailGameLand', '.gameInfo__detail', dataGame);

		$('.gameInfo__box--item' + partido).addClass('gameInfo__box--active');

	};

	// Renderizar con MUSTACHE - Lista partidos
	var showListGame = function () {

		let i = 0;
		let partidos = {};
		let equipos = {};

		equipos.listTeam = GameInfoController.getDataEquipos();

		//Comprobamos si tenemos ya en el DOM la lista partidos
		if ($('.gameInfo__box--item').val() === undefined) {

			let listDateGames = GameInfoController.getListDateGames();
			let listGamesSeparateDate = GameInfoController.getListGamesSeparateDate();

			let text, text1, nummes, nommes;

			for (i = 0; i < listDateGames.length; i++) {

				nommes = listDateGames[i].substring(5, 2) === '09' ? 'Setember' : 'October';
				nummes = listDateGames[i].substring(8);

				text = '<h4><a href="#demo' + i + '" data-toggle="collapse">' + nummes + ' ' + nommes + '</a></h4>';
				text1 = '<ul class="list-group gameInfo__box--' + (i + 1) + ' collapse" id="demo' + i + '"></ul>';
				$(".gameInfo__box").append(text, text1);

				let aux = '.gameInfo__box--' + (i + 1);
				partidos.listGame = listGamesSeparateDate[i];
				utilidades.showTemplate(DOMStrings.listGameInfo, aux, partidos);
			}

			if (listDateGames.length > 0) {
				utilidades.showTemplate('#listEquipLogo', '.listEquipGame', equipos);

				$('.box__equipologo').last().addClass('box__equipologo--current');

				/* Añadimos clase active li para mostrar mapa en modo LANDSCAPE */
				$('.gameInfo__box--item' + partido).addClass('gameInfo__box--active');
				$('.gameInfo__box--' + partido).addClass('in');

				//EVENTOS PARTIDOS NYSL
				//Detectar evento logos de los equipos (FILTRO)
				$(".equipoLogo").on('click', listaPartidosFiltroEquipo);

				//Detectar evento game de la lista PARTIDOS -> Info partido seleccionado
				$(".gameInfo__box--item").on('click', infoDetallePartido);
			} else {
				utilidades.loadJsonFail('.listEquipGame');
			}

		}

	};

	// Renderizar con MUSTACHE - Lista partidos filtrado por equipo seleccionado
	var listaPartidosFiltroEquipo = function () {

		$(".box__equipologo--current").removeClass("box__equipologo--current");

		// Segun equipo elegido (lista escudos equipo)
		partido = this.getAttribute('data-equipo');

		$(this).parent().addClass("box__equipologo--current");

		if (partido === 'nysl') {
			$('.gameInfo__box').empty();
			partido = 1;
			showListGame();
			showDetailGameList(partido);
		} else {
			showListGameFilter(listGameFilter(partido));
		}

	};

	// Detalle partido seleccionado - segun orientacion PORTRAIT/LANDSCAPE, visualizar en pagina DETALLE o INFO
	var infoDetallePartido = function () {

		// numero partido escogido
		partido = this.getAttribute('data-game');

		// Eliminamos la clase li por defecto
		$(".gameInfo__box--active").removeClass("gameInfo__box--active");

		if (applyOrientation() === 'port') {
			//Redireccionamos pantalla detalle del GAME
			showPage(DOMStrings.pageDetailInfo);

			//Informamos datos pagina detalle del GAME
			showDetailGame(partido);

			//Mostramos el detalle de los comentarios chats
			showDetailComment(partido);

			//Si estamos loguedos mostramos "button edit comment"
			if (islogin) {
				$(DOMStrings.navEditBtn).show();
			}
		} else {
			showDetailGameList(partido);
		}

	};

	//Renderizar con MUSTACHE - Lista partidos filtrados
	var showListGameFilter = function (data) {

		$('.gameInfo__box').empty();

		dataAux = {
			listFilter: []
		};

		dataAux.listFilter = data.listFilter.map(function (item) {

			var d = new Date(item.dateGame);
			var listDateGame = item.dateGame.split('-');

			item.dweek = weekdays[d.getDay()];
			item.day = listDateGame[2];
			item.month = listDateGame[1] === '09' ? 'Setember' : 'October';
			return item;
		});

		partido = data.listFilter[0].idGame;

		showDetailGameList(partido);
		utilidades.showTemplate('#listFilterGameInfo', '.gameInfo__box', dataAux);

		//Detectar evento game de la lista PARTIDOS -> Info partido seleccionado
		$(".gameInfo__box--item").on('click', infoDetallePartido);
		$('.gameInfo__box--item' + partido).addClass('gameInfo__box--active');

	};

	var listGameFilter = function (game) {

		let data = GameInfoController.getDataListGame();

		//Estructura template detail Game
		let dataGame = {
			listFilter: []
		};
		dataGame.listFilter = data.listGame.filter(function (c) {
			return c.idHome === game || c.idVisit === game;
		});

		return (dataGame);
	};

	var showDetailGame = function (game, localitation) {

		let data = GameInfoController.getDataListGame();
		let datGame = data.listGame[game - 1];
		let location = data.listLocalGame[datGame.idLocal - 1];

		//Estructura template detail Game
		let dataGame = {};

		var d = new Date(datGame.dateGame);
		var listDateGame = datGame.dateGame.split('-');

		dataGame.name = location.name;
		dataGame.address = location.address;
		dataGame.city = location.city + ',' + location.zipcode;
		dataGame.time = datGame.timeGame;
		dataGame.dweek = weekdays[d.getDay()];
		dataGame.day = listDateGame[2];
		dataGame.idHome = datGame.idHome;
		dataGame.idVisit = datGame.idVisit;
		dataGame.nameHome = data.listTeam[datGame.idHome].nameTeam;
		dataGame.nameVisit = data.listTeam[datGame.idVisit].nameTeam;
		dataGame.urlLoc = location.urlLoc;

		//Renderizar template detalle game portrait
		utilidades.showTemplate('#detailGamePort', '.detail__game', dataGame);

		//Estructura enviar detalle para guardar BBDD
		let structData = {};

		structData.gameId = datGame.idGame;
		structData.gameName = location.name;
		structData.gameText = '';

		// Pasamos valores para guardar en BBDD firebase
		document.getElementById('structGameInfo').value = JSON.stringify(structData);

	};

	//Funciones Publicas
	/****************************************************************************/
	var getDOMstrings = function () {
		return DOMStrings;
	};

	var getDOMEventStrings = function () {
		return DOMEventStrings;
	};
	
	//Redirect Page en menu NAV para SPA
	var redirectPage = function (e) {
		e.preventDefault();

		if (e.target.hash !== undefined && e.target.hash !== '#void') {
			
			//Pagina seleccionada, nos quedamos con el HASH 
			var nextPage = $(e.target.hash);
			$("#pages .current").removeClass("current");
			nextPage.addClass("current");

			//Tratamos lista GAMES para la pagina INFO
			if (e.target.hash === '#page-info') {
				showListGame();
				showDetailGameList(partido);
			} else {
				//Ocultamos button "edit comment" para las otras paginas que no sean detalle GAME
				$(DOMStrings.navEditBtn).hide();
			}
		}

		//Cerramos el menu lateral navegacion
		closeNav();
	};

	var openNav = function () {

		$(DOMStrings.headerNav).animate({
			left: "0"
		});
	};

	var closeNav = function () {

		$(DOMStrings.headerNav).animate({
			left: "-200"
		});

	};

	//Mostramos la pagina SPA
	var showPage = function (page) {
		$("#pages .current").removeClass("current");
		$(page).addClass("current");
	}
	
	// FIREBASE GOOGLE sign in
	var googleSignIn = function () {

		$(DOMStrings.errorSignIn).html('');
		var provider = new firebase.auth.GoogleAuthProvider();

		//FIREBASE SIGN IN --> GOOGLE
		firebase.auth().signInWithPopup(provider).catch(function (error) {

			// Handle Errors here.
			var errorCode = error.code;
			var errorMessage = error.message;
			$(DOMStrings.errorSignIn).html(errorMessage).css("color", "red");
		});
	};

	//FIREBASE SIGN OUT
	var signOutUser = function () {

		$(DOMStrings.navEditBtn).hide();

		//FIREBASE SIGN IN --> SIGN OUT
		firebase.auth().signOut().then(function () {

			let source = $(".current").data("source");
			if (source === 'comment') {
				showPage(DOMStrings.pageHome);
			}
		}).catch(function (error) {

			let source = $(".current").data("source");
			if (source === 'comment') {
				showPage(DOMStrings.pageHome);
			}
		});
	};

	//FIREBASE SIGN IN (mail/password)
	var toggleSignIn = function () {

		$(DOMStrings.errorSignIn).html('');

		if (firebase.auth().currentUser) {
			firebase.auth().signOut();
		} else {

			//Datos formulario SIGN IN
			let email = document.getElementById('usrname').value;
			let password = document.getElementById('psw').value;

			if (validateSignIn(email, password, '1') !== '') {
				return;
			}

			// Sign in with email and pass.
			firebase.auth().signInWithEmailAndPassword(email, password).catch(function (error) {
				// Handle Errors here.
				var errorCode = error.code;
				var errorMessage = error.message;
				$(DOMStrings.errorSignIn).html(errorMessage).css("color", "red");
			});
		}
	};

	//FIREBASE crear usuario (mail/password)
	var handleSignUp = function () {

		$(DOMStrings.errorSignUp).html('');
		let email = document.getElementById('usrSignUp').value;
		let password = document.getElementById('pswSignUp').value;

		if (validateSignIn(email, password, '2') !== '') {
			return;
		}

		// Sign up with email and pass.
		firebase.auth().createUserWithEmailAndPassword(email, password).catch(function (error) {
			// Handle Errors here.
			var errorCode = error.code;
			var errorMessage = error.message;
			$(DOMStrings.errorSignUp).html(errorMessage).css("color", "red");
		});
	};

	var showSignUp = function () {
		$(DOMStrings.myModal).modal('hide');
		$(DOMStrings.modalSignUp).modal('show');
	};

	var showComment = function () {
		showPage(DOMStrings.pageComment);
	};
	
	var chatComment = function (e) {

		e.preventDefault();
		let text = $(DOMStrings.newPostMessage).val();

		if (text) {
			let objcomment = JSON.parse($(DOMStrings.structGameInfo).val());
			objcomment.gameText = text;

			newCommentForCurrentUser(objcomment).then(function () {
				showPage(DOMStrings.pageDetailInfo);
				showDetailComment(objcomment.gameId);
			});

			//Reset el valor input form Chat comment
			$(DOMStrings.newPostMessage).val("");
		}
	};

	//FIREBASE detecta si ha cambioen el estado Usuario
	var onAuthStateChanged = function (user) {

		// We ignore token refresh events.
		if (user && currentUID === user.uid) {
			return;
		}

		cleanupUi();
		if (user) {
			currentUID = user.uid;
			writeUserData(user.uid, user.displayName, user.email, user.photoURL);
			startDatabaseQueries("0");

			$('.nav__login-btn').hide();
			$('.nav__logout-btn').show();
			$('#myModal').modal('hide');
			$('#modalSignUp').modal('hide');
			islogin = true;

			if ($(".current").data("source") === "detailinfo") {
				$(DOMStrings.navEditBtn).show();
				showDetailComment(partido);
			}

		} else {
			currentUID = null;
			$('.nav__login-btn').show();
			$('.nav__logout-btn').hide();
			$('#recent-comments-list').hide();
			islogin = false;
		}
	};

	var setRecentCommentSection = function (rCommentSection) {

		recentCommentSection = rCommentSection;
	}
	
	return {
		getDOMstrings: getDOMstrings,
		getDOMEventStrings: getDOMEventStrings,
		redirectPage: redirectPage,
		showPage: showPage,
		openNav: openNav,
		closeNav: closeNav,
		googleSignIn: googleSignIn,
		signOutUser: signOutUser,
		toggleSignIn: toggleSignIn,
		handleSignUp: handleSignUp,
		showSignUp: showSignUp,
		showComment: showComment,
		chatComment: chatComment,
		onAuthStateChanged: onAuthStateChanged,
		setRecentCommentSection: setRecentCommentSection
	};

})();

//********************************************************************
// GameInfoController
//********************************************************************
var GameInfoController = (function () {

	let listDateGames = [];
	let listGamesSeparateDate = [];
	let dataListGame = {
		listGame: [],
		listLocalGame: [],
		listTeam: []
	};

	//Tratamos los datos recuperados del JSON - GAME INFO
	var tratarJsonData = function (data) {

		dataListGame.listGame = data.dataListGame.listGame;
		dataListGame.listLocalGame = data.dataListGame.listLocalGame;
		dataListGame.listTeam = data.dataListGame.listTeam;


		// lista fechas de partidos sin duplicados
		listDateGames = removeDuplicates(dataListGame.listGame, "dateGame").map(function (item) {
			return item.dateGame;
		});

		// Creamos la lista de partidos por fecha
		let i = 0;
		for (i = 0; i < listDateGames.length; i++) {
			let list_aux = dataListGame.listGame.filter(function (gameItem) {
				return gameItem.dateGame === listDateGames[i];
			});
			listGamesSeparateDate.push(list_aux);
		}
	};

	// Eliminamos duplicados de un array objetos de una propiedad del array
	var removeDuplicates = function (arr, prop) {
		var obj = {};
		return Object.keys(arr.reduce((prev, next) => {
			if (!obj[next[prop]]) obj[next[prop]] = next;
			return obj;
		}, obj)).map((i) => obj[i]);
	};

	// Get lista fechas partidos
	var getListDateGames = function () {
		return listDateGames;
	};

	// Get lista partidos por fecha
	var getListGamesSeparateDate = function () {
		return listGamesSeparateDate;
	};

	// Get data info game
	var getDataListGame = function () {
		return dataListGame;
	};

	// Get data info equipos
	var getDataEquipos = function () {
		return dataListGame.listTeam;
	}

	return {
		tratarJsonData: tratarJsonData,
		getListDateGames: getListDateGames,
		getListGamesSeparateDate: getListGamesSeparateDate,
		getDataListGame: getDataListGame,
		getDataEquipos: getDataEquipos
	}


})();

// GLOBAL APP CONTROLLER
var controller = (function (GameInfoCtrl, UICtrl) {

	var setupEventListeners = function () {

		let signInButton, signOutButton, nyslSignIn, nyslSignUp, modalSignUp, editButton, messageForm;

		UICtrl.setRecentCommentSection(document.getElementById('recent-comments-list'));

		var DOM = UICtrl.getDOMstrings();
		var DOMEvent = UICtrl.getDOMEventStrings();

		signInButton = document.getElementById(DOMEvent.signInButton);
		signOutButton = document.getElementById(DOMEvent.signOutButton);
		nyslSignIn = document.getElementById(DOMEvent.nyslSignIn);
		nyslSignUp = document.getElementById(DOMEvent.nyslSignUp);
		modalSignUp = document.getElementById(DOMEvent.modalSignUp);
		editButton = document.getElementById(DOMEvent.editButton);
		messageForm = document.getElementById(DOMEvent.messageForm);

		//Events cambio de pagina en SPA
		//********************************************************************
		$(DOMEvent.headerNavA).click(UICtrl.redirectPage);
		$(DOMEvent.imageHeadingA).click(UICtrl.redirectPage);
		$(DOMEvent.logoBoxImg).click(function (e) {
			UICtrl.showPage(DOM.pageHome);
		});

		// Eventos menu navegacion --> JQUERY
		$(DOM.navBackBtn).on("click", UICtrl.openNav);
		$(DOM.headerNavBtnclose).on("click", UICtrl.closeNav);

		//Listen SIGN IN/SIGN UP/ FORMULARIOS --> JAVASCRIPT
		signInButton.addEventListener('click', UICtrl.googleSignIn, false);
		signOutButton.addEventListener('click', UICtrl.signOutUser, false);
		modalSignUp.addEventListener('click', UICtrl.showSignUp, false);
		nyslSignIn.addEventListener('submit', UICtrl.toggleSignIn, false);
		nyslSignUp.addEventListener('submit', UICtrl.handleSignUp, false);

		// Eventos paneles collapse paginas --> RULES, ABOUT
		$(DOMEvent.panelCollapse).on('show.bs.collapse', function () {
			$(this).siblings('.panel-heading').addClass('active');
		});

		$(DOMEvent.panelCollapse).on('hide.bs.collapse', function () {
			$(this).siblings('.panel-heading').removeClass('active');
		});

		//Listen events COMMENTS --> CHAT
		editButton.addEventListener('click', UICtrl.showComment, false);
		messageForm.addEventListener('submit', UICtrl.chatComment, false);

		// Listen for auth state changes FIREBASE
		firebase.auth().onAuthStateChanged(UICtrl.onAuthStateChanged);

	}

	return {
		init: function (data) {
			console.log('Application has started.');
			GameInfoCtrl.tratarJsonData(data);
			setupEventListeners();
		},
		initFail: function () {
			console.log('Application has started: FAIL JSON');
			setupEventListeners();
		}
	};

})(GameInfoController, UIController);

//********************************************************************
// APP inicial 
//********************************************************************
$(document).ready(function () {

	//Realizamos llamada AJAX - getJSON 
	var callJson = utilidades.cargarDatosJson();
	callJson.done(function (data) {
		controller.init(data);
	}).fail(function () {
		controller.initFail();
	});

});
