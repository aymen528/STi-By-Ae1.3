// JavaScript Expilcation totale
/**----------------------------------------------------------------------
		On prépare une fonction qui vérifie le choix de la civilité
-------------------------------------------------------------------------**/
function testr(){
var radios = document.getElementsByTagName('input');
	
var value;
	var n;
	let ok=false;
for (var i = 0; i < radios.length; i++) 
	{
    	if (radios[i].type === 'radio' && radios[i].checked) 
			{
        			// get value, set checked flag or do whatever you need to
        			ok = true;
				alert(radios[i].value)
			}
	}
	alert(ok)
	}
document.querySelector('.cv1').addEventListener("click",testr);


/*let contact = document.querySelectorAll("input['cv1']:checked ");
                                  // or '.your_radio_class_name'
alert(contact)
/*
for (let i = 0; i < contact.length; i++) {
  contact[i].addEventListener("change", function() {
    let val = this.value; // this == the clicked radio,
    console.log(val);
  });
}
*/

function choixcv()
{
	/* -----------------------1ère version------------------
		let s1 =document.getElementsByName("cv").item(0).checked;
		let s2 =document.getElementsByName("cv").item(1).checked;
		let ok = s1 || s2;	
	-----------------------------------------------------------------*/
	/*----------------------2ème version----------------------------
	Il s'agit d'une méthode largement utilisée aussi et qui consiste à
retourner tous les objets de même type (même balise) en tant que
tableau et en sélectionner un via son indexe (l'indexe 0 pour le premier
élément, 1 pour le deuxième...)
	----------------------------------------------------------------*/
		let radios = document.getElementsByTagName('input');
		let ok=false;
			for (let i = 0; i < radios.length; i++) 
				{
    				if (radios[i].type === 'radio' && radios[i].checked) 
							ok = true;
				}
	
		if (!ok)
				document.getElementById("Civilite").style.backgroundColor="red";
			
		else
				document.getElementById("Civilite").style.backgroundColor="green";
		
		return ok;	
		
	}
//document.querySelectorAll('cv1[0]').addEventListener("change",choixcv);
//document.getElementsByName("cv").addEventListener("click",choixcv);

/**----------------------------------------------------------------------
		On prépare une fonction pour afficher la valeur de l'âge  
-------------------------------------------------------------------------**/
function afficheage(){
	//Rappel: le mot let avant le nom d'une varaible précise que la variable ne circule que dans le bloc actuel===>dans notre cas elle circule dans le bloc de la fonction
	let a = document.getElementById("age");
	//on va tester si l'age est > 30 la bordure serait avec la couleur rouge sinn avec la couleur verte
	if (a.value>30)
		{
			document.getElementById("affage").style.borderColor="red";
			document.getElementById("affage").style.backgroundColor="red"	;
			document.getElementById("affage").style.color="black";	
			document.getElementById("affage").value= a.value;
		}
	else
		{
			document.getElementById("affage").style.borderColor="black";	
			document.getElementById("affage").style.backgroundColor="green"	;
			document.getElementById("affage").style.color="white";	
			document.getElementById("affage").value= a.value;
		}
}

// l'appel de la fonction afficheage qui permet d'afficher l'age 
document.getElementById("age").addEventListener("click", afficheage);

/**----------------------------------------------------------------------
	On prépare une fonction pour vérifier les chaines alphabétiques
-------------------------------------------------------------------------**/

function alpha(ch){
	//on prépare une constante qui contient toutes les lettres alphabétiques ainsi l'éspace
		const alphabet=" AZERTYUIOPQSDFGHJKLMWXCVBN";
		let nb=0;
	//parcourir toute la chaine donnée pour chercher 
	//pour que la variable i ne soit visiualisée que dans la boucle for on utiulise "let"
		for(let i=0;i<ch.length;i++)
			{
				if (alphabet.indexOf(ch.charAt(i))>=0) 
					nb++;
			}
			return (ch.length==nb);
}
/**----------------------------------------------------------------------
	La fonction verifnom permet de vérifier que le champ nom et prénom n'est composé que
	de lettres alphabétiques ou éspace.
	On ajoute qu'il faut avoir au max 5 mots
-------------------------------------------------------------------------**/

function verifnom()
	{
		let np =document.getElementById("np").value;
		let ok =true;
	//tout d'abord on va nettoyer la chaine de tous les éspaces avant et aprés chaine(voir page 31)
		np=np.trim();
		document.getElementById("np").value=np;
	//il vaut mieux ajouter cette inner afin d'éliminer le message au cas où l'utilisateur coorige l'erreur
		document.getElementById("npa").innerHTML="";
	//tester si la chaine est formée seulement par des lettres et/ou espace
if ( np.length==0)
			{
			document.getElementById("np").select();//le champ sera sélectionné de nouveau
			document.getElementById("npa").style.color="red";
			document.getElementById("npa").innerHTML="Attention champ vide";
			ok=false;	
			}
else if  (!alpha(np.toUpperCase()))
			{
			document.getElementById("np").select();//le champ sera sélectionné de nouveau
			document.getElementById("npa").style.color="red";
			document.getElementById("npa").innerHTML="Attention champ ne contenant que des lettres aplhabétiques et éspace";
			ok=false;	
			}
else 
  {
	//tester si la chaine est composée 5 mots au plus 
	// pour cette raison on va décomposer la chaine suivant l'ésapce en utilisant la fonction split (voir page 31)
		let tableaumot = np.split(" ");
		let tailletableaumot = tableaumot.length;
		if( tailletableaumot > 5)
			{
				document.getElementById("npa").style.color="red";
				document.getElementById("npa").innerHTML="Attention le nombre de mots est plus que 5";
				ok=false;
			}
	//si le champ est valable on change la couleur du champ avec la couleur verte et le rendre disabled....on change la couleur du texte en blanc aussi
		if  (ok)
			{
				document.getElementById("np").style.backgroundColor="green";
				document.getElementById("np").style.color="white";
				document.getElementById("np").disabled=true;
			}
	 }
	return ok;
	
	}
//vider le champ tout d'abord
document.getElementById("np").addEventListener("click" , function (){document.getElementById("np").value=""})

//l'appel de la fonction vérification du champ nom
document.getElementById("np").addEventListener("blur", verifnom);

/**----------------------------------------------------------------------
								Tèl
-------------------------------------------------------------------------/
	On prépare une fonction pour vérifier les chaines composés seulement par des chiffres
-------------------------------------------------------------------------**/
// voici la 1ère solution
/*
function numerique(ch){
		const chiffre="0123456789";
		let nb=0;
			for(let i=0;i<ch.length;i++)
			{
				if (chiffre.indexOf(ch.charAt(i))>=0) 
					nb++;
			}
			return (ch.length==nb);
}
*/
/* 2ème solution
Remarque la fonction parseint convertit les preirs chiffres de la chaine*/
function numerique(ch){
	let convers = Number.parseInt(ch,10);//la base est 10 est par défaut==c'est donc facultatif
	//par la suite on converti la variable "convers" en chaine afin de la comparer avec la chaine en entrée
	return (convers.toString() == ch);
}
function veriftel(){
	let t = document.getElementById("tel").value;
	let ok=true;
	let apres0 = "";
	let msg="";
document.getElementById("tela").innerHTML= msg;//cette insruction sert à éliminer tout ancien message
/*  Test avec 00 et ou + */
if (t=="")
		{
				msg = "Champ Vide" ;	
				ok=false;
		}
	//vérifier le début du numéro de tel
				
else if (!  (t.substr(0,1) == "+"))
		{
				ok=false;
				msg = "ça doit commerncer par 0 ou + et ne contenant que des chiffres" ;
		}
else if(t.substr(0,2) == "00" )
		{
				apres0 = t.substring(2)	;//extraction de toute la chaine aprés 00
		}
else if (  (t.substr(0,1) == "+"))
		{	
				apres0 = t.substring(1);//extraction de toute la chaine aprés +
		}
/*-------------------------- Test avec le reste---------------------------
------------en cas d'erreur afficher en rouge et focus	------------------*/
	
if (!( (numerique(apres0) )&& ( apres0.length == 11) && (ok) ))
		{
				document.getElementById("tela").style.color="red";
				document.getElementById("tel").style.backgroundColor="red";
				document.getElementById("tela").innerHTML= msg;
				document.getElementById("tel").select();			
				ok=false;
/*-----il faut mettre ok avec la valeur Faux car il se peut que le reste de lachaine soit <11 ou le reste n'est pas une chaine numérique malgrés qu'on commence avec 00 ou + ------------*/
		}

else  
		{
				document.getElementById("tel").style.color="white";
				document.getElementById("tel").style.backgroundColor="green";
				document.getElementById("tel").disabled=true;
		}

return (ok);
}

document.getElementById("tel").addEventListener("blur" ,veriftel);
document.getElementById("tel").addEventListener("click" , function (){document.getElementById("tel").value=""})




/**----------------------------------------------------------------------
								Mail
-------------------------------------------------------------------------**/
function alphanumpt(ch)
{
	const alphanum="AZERTYUIOPMLKJHGFDSQWXCVBN.0123456789";
	let ok = true;
	for (let i = 0;i<ch.length; i++)
		if (alphanum.indexOf(ch.charAt(i).toUpperCase())<0)
			ok =false;
	return ok;
}
/*----------------------------------------------------------------------------------
		1. le mail doit comporter @
		2. on doit trouver au moins 2 mots aprés @ séparés par .
		3. la dernière chaine doit être alphabétique
-----------------------------------------------------------------------------------*/
function verifmail()
{
	let msg="";
	let ok=true;
	let ok1=true;
	let ok2=true;
	let ok3=true;
	let mail = document.getElementById("mail");
	
	//extraire la chaine avant "@"
	let av = mail.value.substr(0,mail.value.indexOf('@'));
	if (mail.value.length==0)
		{
			msg = "mail invalide (Champ vide)";
					ok1 = false;			
		}
	
	else if (mail.value.indexOf('@')< 0)
		{
			msg = "mail invalide abscence de @";
					ok1 = false;			
		}
	else if (!alphanumpt(av))
		{
				msg = "mail invalide chaine non alphnumérique avant @";
		    	ok1 = false;			
		}
	else
		{
		//la chaine aprés "@"
			let ap = mail.value.substr(mail.value.indexOf('@')+1);
		//j'ai mis les mots séparés par point dans un tableau
			let tabap = ap.split('.');
			if (( tabap.length<1) || ( tabap.length>3))
					{
						msg = "il faut avoir au max 3 mots séparés par point aprés @"
						ok2 = false;
					}
	//je vais boucler dans le tableau afin de vérifier chaque mot
			else 
					{
						for (let i=0 ;i<tabap.length;i++)
							if (! alpha(tabap[i].toUpperCase()))
									{
										msg= " Vérifier les mots aprés @";
										ok3=false;
									}
					}
		}
ok = ok1 && ok2 && ok3  ;
	
	if (!ok)
		{
			document.getElementById("maila").style.color="red";
			document.getElementById("mail").style.backgroundColor="red";
			document.getElementById("maila").innerHTML= msg;
			document.getElementById("mail").select();			
		}
	else  
		{
			document.getElementById("mail").style.backgroundColor="green";
			document.getElementById("mail").style.color="white";
			document.getElementById("mail").disabled=true;
		}
		
	return ok
	
}

document.getElementById("mail").addEventListener("blur" , verifmail);
//.........................................
document.getElementById("mail").addEventListener("click" , function (){document.getElementById("mail").value=""})

/**----------------------------------------------------------------------
								Retaper Mail
-------------------------------------------------------------------------**/
function retapmail()
{
	let ok = true;
	let msg ;
	if (document.getElementById("mailc").value=="")
	{
			msg = "Attention champ vide"
			ok=false
	}
else if (document.getElementById("mail").value != document.getElementById("mailc").value)
	{
			msg = "verifier que vous avez entrer la meme adresse ou n'est pas vide"
			ok=false
	}
	
if (!ok)
		{
			document.getElementById("mailc").style.backgroundColor="red";
			document.getElementById("mailc").style.color="white";
			document.getElementById("mailc").value= msg;
			document.getElementById("mailc").select();			
		}
else  
		{
			document.getElementById("mailc").style.backgroundColor="green";
			document.getElementById("mailc").style.color="white";
			document.getElementById("mailc").disabled=true;
		}
	return ok;
}

document.getElementById("mailc").addEventListener("blur" ,retapmail);
//.........................................
document.getElementById("mailc").addEventListener("click" , function (){document.getElementById("mailc").value=""})

/**----------------------------------------------------------------------
								Ajouter ville
avant d'ajouter une ville il faut vérifier est ce déjà existante et/ou le code postal est déjà utilisé
le code postal doit etre un entier composé de 4 chiffres
-------------------------------------------------------------------------**/

function verifville(ch)
{
	let indice = -1;
 //Remarque: Ne pas oublier de comparer les majuscules des chaînes
 for (let i=0; i< document.getElementById("ville").options.length ;i++)
		if (document.getElementById("ville").options[i].text.toUpperCase()== ch.toUpperCase() )
			{
				indice =  i;
			}
	return indice;
}

function verifcodepostal(ch)
{
	let indice = -1;
 //Remarque: Ne pas oublier de comparer les majuscules des chaînes
 for (let i=0; i< document.getElementById("ville").options.length ;i++)
		if (document.getElementById("ville").options[i].value== ch )
			{
				indice =  i;
			}
	return indice;
}

function ajoutville()
{
	let villenew = prompt("Donner la nouvelle ville à ajouter").trim()
	if (verifville(villenew) > -1)
		{
			alert("ville déjà exitante")
		}
	else
		{
			let codep = prompt("Donner le code postal de la ville").trim()
	//vérifier format du code postal sinon redemander une autre fois
			if (!((codep.length==4)&& (numerique(codep))))
				{ 
						codep = prompt("Code postal érroné, Veuillez entrer un code de 4 chiffres ").trim();
				}
	/* ---------------------------------------------------------------------------------
		chercher si le code postal existe déjà on doit redemander:
	si la demande ne cesse que lors d'un code non utilisé on utilise la boucle While dans ce cas-------------------------------------------------------------------------------	*/
			
			else if ( verifcodepostal(codep) > -1)
				{
					codep = prompt("Code postal déjà existant, Merci de réintègrer le code postal");
				}
			else 
				{
						let l = document.getElementById("ville").options.length;
	//remarque trés importante:::si on utilise getelementbyid on ne met pas la méthode .value
						document.getElementById("ville").options[l] = new Option(villenew,codep);
						document.getElementById("ville").style.borderColor="blue"
				}
		}
	
}

document.getElementById("aville").addEventListener("click",ajoutville);

/**----------------------------------------------------------------------
								Choix ville
-------------------------------------------------------------------------**/
function verifchoixville()
{
	let ok=true;
	if (document.getElementById("ville").options.selectedIndex == 0 )
		{
			document.getElementById("ville").style.borderColor="red"
			document.getElementById("ville").style.backgroundColor="red"
			document.getElementById("ville").style.color="white"	
			ok=false
		}
	else
		{
			document.getElementById("ville").style.borderColor="green"
			document.getElementById("ville").style.backgroundColor="green"
			document.getElementById("ville").style.color="white"
			ok=true;
		}
	return ok;
}
document.getElementById("ville").addEventListener("blur",verifchoixville);
/**----------------------------------------------------------------------
								Champ Remarque:
  On n'accepte que 30 caractère, une fois le nombre est éteint on bloque le champ
on prévoit à afficher le nombre de caractères restant à chaque touche
-------------------------------------------------------------------------**/
//il faut initialiser le compteur en dehors de la fonction	
compteur = 31;

function remarque()
{
	compteur--;
	document.getElementById("nc").value = compteur;
	if (compteur==0)
		{
			document.getElementById("rq").disabled=true;//ici on bloque le champ
			document.getElementById("rq").style.borderColor="black"
			document.getElementById("rq").style.backgroundColor="grey"
		}
		
}

document.getElementById("rq").addEventListener("keypress",remarque);


/**----------------------------------------------------------------------
								Accepter terme
	le bouton envoyer ne sera actif que lorsq'on coche la case de validation
-------------------------------------------------------------------------**/
function faccepter()
{
	let acc=document.getElementById("accepter");
	if (acc.checked)
				document.getElementById("envoyer").disabled=false;	
	
}

document.getElementById("accepter").addEventListener("click",faccepter);

/**------------------------------------------------------------------
	***************************************************************
	*   Et enfin la fonction verif qui controle tt le formulaire  *
	***************************************************************
----------------------------------------------------------------------**/
function verif()
{
	let ok=true;
	if(!verifnom() )
		ok= false;
	
	if(!choixcv() )
		ok = false;
	
	if(!veriftel() )
		ok = false;
	
	if(! verifmail() )
		ok =false;
	if(! verifchoixville() )
		ok = false;
	if(! veriftel() )
		ok = false;
			
	
	return ok
	
}
/**************************************************************************************
Remarque trop importante:Notez que l’événement submit se déclenche uniquement sur l’élement form, et pas sur les éléments button ou input submit. (Les formulaires sont soumis, pas les boutons.)
document.getElementById("f").addEventListener("submit",verif); ===> provoque une erreur
****************************************************************************************/

