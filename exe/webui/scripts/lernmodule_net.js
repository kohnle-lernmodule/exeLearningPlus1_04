// ===========================================================================
// eXelearningPlus
// Copyright 2009 lernmodule.net, http://www.lernmodule.net
//
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
// ===========================================================================
//
//

var lm_suspend_data="",
	lm_suspend=new Array(),
	suspendArray=new Array(),
	ai_score=new Array(),
	ai_poss_score=new Array(),
	masteryscore = 70;


// FillIn Field Stuff /////////////////////////////////////////////////
//This is derived from the exe builtin clozeIDevice
//This IDevice supports SCORM functionality and has Dropdownmenues
//to select the correct Words


// Functions

// Recieves and marks answers from student
function FillInSubmit(ident) {

	function checkAndMarkFillInWord(ele) {
	    var guess = ele.innerHTML,fstatus;
	    var original = getFillInAnswer(ele, 0);
	    var answer = original.split('|')[0];
	    if (guess==answer) fstatus=2;
		else if (guess=="?") fstatus=0;
		else fstatus=1;
		markFillInWord(ele,fstatus);
		return fstatus;
	}

	// Returns an array of input elements that are associated with a certain idevice
	function getFillInInputs(ident) {
	    var result = new Array;
	    var FillInDiv = document.getElementById('FillIn'+ident)
	    recurseFindFillInInputs(FillInDiv, ident, result);
	    return result;
	}
	
    var score = 0, suspend_string = "";
    var inputs = getFillInInputs(ident);
    for (var i=0; i<inputs.length; i++) {
        if (checkAndMarkFillInWord(inputs[i]) == 2){
            suspend_string += "1";
            score++;
        }
		else suspend_string += "0";
    }

	document.getElementById('FillInScore'+ident).innerHTML = "Punkte: "+score+" von "+inputs.length;
	
	setStatus(ident,suspend_string,score,inputs.length);
}

// Marks a FillIn question (at the moment just changes the color); 'mark' should be 0=Not Answered, 1=Wrong, 2=Right
function markFillInWord(ele, mark) {
	var bcolor="gray",actelement=ele.parentNode;
	actelement.disabled=true;
	actelement.style.color="black";
	if(mark==1) bcolor="red";
	if(mark==2) bcolor="lime";
	if (navigator.appVersion.indexOf("MSIE")>-1) actelement.style.backgroundColor=bcolor;
	actelement.style.border="2px solid "+bcolor;
}

// Decrypts and returns the answer for a certain FillIn field word
function getFillInAnswer(ele, mode) {

	// Extracts the idevice id and input id from a javascript element
	function getFillInIds(ele) {
	    // Extract the idevice id and the input number out of the element's id
	    // id is "FillInBlank%s.%s" % (idevice.id, input number)
	    var id = ele.parentNode.id.slice(11);
	    var dotindex = id.indexOf('.');
	    var ident = id.slice(0, dotindex);
	    var inputId = id.slice(id.indexOf('.')+1);
	    return [ident, inputId];
	}

    var idents, ident, inputId;
    if (mode == 0) idents = getFillInIds(ele)
	else idents = ele.split('.');
	ident = idents[0];
	inputId = idents[1];

    var answerSpan = document.getElementById('FillInAnswer'+ident+'.'+inputId);
    var code = answerSpan.innerHTML;
    code = decode64(code);
    code = unescape(code);
    // XOR "Decrypt"
    var result = '';
    var key = 'X'.charCodeAt(0);
    for (var i=0; i<code.length; i++) {
        var letter = code.charCodeAt(i);
        key ^= letter;
        result += String.fromCharCode(key);
    }
    return result;
}

// Adds any FillIn inputs found to result, recurses down
function recurseFindFillInInputs(dad, ident, result) {
    var tmp=0;
    for (var i=0; i<dad.childNodes.length; i++) {
    	tmp=0;
        var ele = dad.childNodes[i];
        // See if it is a blank
        if (ele.id) {
            if (ele.id.search('FillInBlank'+ident) == 0) {
                for (var k=0; k<ele.options.length;k++){
                    if(ele.options[k].selected == 1){
                        result.push(ele.options[k]);
                        tmp = 1;
                        break;
                    }
                }
            }
        }
        if (tmp == 1) continue;
        // See if it contains blanks
        if (ele.hasChildNodes()) {
            recurseFindFillInInputs(ele, ident, result);
        }
    }
}


// ===========================================================================
//SCORM Cloze Field Stuff /////////////////////////////////////////////////
// Functions

// Recieves and marks answers from student
function ScormClozeSubmit(ident) {

	// Returns an array of input elements that are associated with a certain idevice
	function getScormClozeInputs(ident) {
		var result = new Array;
		var ScormClozeDiv = document.getElementById('ScormCloze'+ident);
		recurseFindScormClozeInputs(ScormClozeDiv, ident, result);
		return result;
	}

	var score = 0, suspend_string = "", c_score;
	var inputs = getScormClozeInputs(ident);
	for (var i=0; i<inputs.length; i++){
		if (checkAndMarkScormClozeWord(inputs[i])==2){
			suspend_string += "1";
			score++;
		}
		else suspend_string += "0";
	}
	// Show it in a nice paragraph
	document.getElementById('ScormClozeScore' + ident).innerHTML = "Punkte: "+score+" von "+inputs.length;
	setStatus(ident,suspend_string,score,inputs.length);
}

// Marks a ScormCloze word in view mode.
// Returns NOT_ATTEMPTED, CORRECT, or WRONG
function checkAndMarkScormClozeWord(ele) {

	// Returns the corrected word or an empty string
	function checkScormClozeWord(ele) {
	    var guess = ele.value;
	    // Extract the idevice id and the input number out of the element's id
	    var original = getScormClozeAnswer(ele);
	    var answer = strip_ws(original);
	    var guess = strip_ws(ele.value);
	    var ident = getScormClozeIds(ele)[0];
	    // Read the flags for checking answers
	    var strictMarking = eval(document.getElementById(
	        'ScormClozeFlag'+ident+'.strictMarking').value);
	    var checkCaps = eval(document.getElementById(
	        'ScormClozeFlag'+ident+'.checkCaps').value);
	    if (!checkCaps) {
	        guess = guess.toLowerCase();
	        answer = original.toLowerCase();
	    }
	    if (guess == answer)
	        // You are right!
	        return original;
	    else if (strictMarking || answer.length <= 4)
	        // You are wrong!
	        return "";
	    else {
	        // Now use the similarity check algorythm
	        var i = 0, j = 0;
	        var orders = [[answer, guess], [guess, answer]];
	        var maxMisses = Math.floor(answer.length / 6) + 1;
	        var misses = 0;
	        if (guess.length <= maxMisses) {
	            misses = Math.abs(guess.length - answer.length);
	            for (i = 0; i < guess.length; i++ ) {
	                if (answer.search(guess[i]) == -1) {
	                    misses += 1;
	                }
	            }
	            if (misses <= maxMisses) {
	                return original;
	            } else {
	                return "";
	            }
	        }
	        // Iterate through the different orders of checking
	        for (i = 0; i < 2; i++) {
	            var string1 = orders[i][0];
	            var string2 = orders[i][1];
	            while (string1) {
	                misses = Math.floor(
	                            (Math.abs(string1.length - string2.length) +
	                             Math.abs(guess.length - answer.length)) / 2)
	                var max = Math.min(string1.length, string2.length);
	                for (j = 0; j < max; j++) {
	                    var a = string2.charAt(j);
	                    var b = string1.charAt(j);
	                    if (a != b)
	                        misses += 1;
	                    if (misses > maxMisses)
	                        break;
	                }
	                if (misses <= maxMisses)
	                    // You are right
	                    return original;
	                string1 = string1.substr(1);
	            }
	        }
	        // You are wrong!
	        return "";
	    }
	}

    var result = checkScormClozeWord(ele);
    if (result != '') {
        markScormClozeWord(ele,2);
        ele.value = result;
        return 2;
    } else if (!ele.value) {
        markScormClozeWord(ele,0);
        return 0;
    } else {
        markScormClozeWord(ele,1);
        return 1;
    }
}

// Marks a ScormCloze question (at the moment just changes the color)
// 'mark' should be 0=Not Answered, 1=Wrong, 2=Right
function markScormClozeWord(ele, mark) {
	ele.readOnly=true;
    switch (mark) {
        case 0:
            // Not attempted
            ele.style.border = "1px solid gray";
            break;
        case 1:
            // Wrong
            ele.style.border = "1px solid red";
            break;
        case 2:
            // Correct
            ele.style.border = "1px solid lime";
            break;
    }
    return mark;
}

// Decrypts and returns the answer for a certain ScormCloze field word
function getScormClozeAnswer(ele) {
    var idents = getScormClozeIds(ele);
    var ident = idents[0];
    var inputId = idents[1];
    var answerSpan = document.getElementById('ScormClozeAnswer'+ident+'.'+inputId);
    var code = answerSpan.innerHTML;
    code = decode64(code);
    code = unescape(code);
    // XOR "Decrypt"
    var result = '';
    var key = 'X'.charCodeAt(0);
    for (var i=0; i<code.length; i++) {
        var letter = code.charCodeAt(i);
        key ^= letter;
        result += String.fromCharCode(key);
    }
    return result;
}

// Extracts the idevice id and input id from a javascript element
function getScormClozeIds(ele) {
    // Extract the idevice id and the input number out of the element's id
    // id is "ScormClozeBlank%s.%s" % (idevice.id, input number)
    var id = ele.id.slice(15);
    var dotindex = id.indexOf('.');
    var ident = id.slice(0, dotindex);
    var inputId = id.slice(id.indexOf('.')+1);
    return [ident, inputId];
}

// Adds any ScormCloze inputs found to result, recurses down
function recurseFindScormClozeInputs(dad, ident, result) {
    for (var i=0; i<dad.childNodes.length; i++) {
        var ele = dad.childNodes[i];
        // See if it is a blank
        if (ele.id) {
            if (ele.id.search('ScormClozeBlank'+ident) == 0) {
                result.push(ele);
                continue;
            }
        }
        // See if it contains blanks
        if (ele.hasChildNodes()) {
            recurseFindScormClozeInputs(ele, ident, result);
        }
    }
}

// check if blank at beginning or end
function strip_ws(to_strip){
	while (true){
		if (to_strip.charAt(0) == ' ') to_strip = to_strip.substring(1);
		else break;
	}
	while (true){
		if (to_strip.charAt(to_strip.length - 1) == ' ') to_strip = to_strip.substring(0,to_strip.length - 1);
		else break;
	}
	return to_strip;
}


// ============================================================================================
// functions for MultiSelect

function ScormMultiSelectSubmit(num, ident, b_submit){

	function toScorm(raw_data){
		var suspend_data="", abc = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
		for (var i=0; i<raw_data.length; i++){
			if (i > 25) break;
			if (raw_data.charAt(i) == '1') suspend_data += abc[i] + ",";
		}
		return suspend_data.substring(0,suspend_data.length-1);
	}
	var i, u=0, score=0,suspend_string="", separator="~", poss_corr=0, act_corr=0, act_incorr=0,lmfeedback="", truefalse;
	for(i=0; i<num; i++){
        var ele = document.getElementById(ident+i.toString());
		ele.disabled=false;
		if(b_submit==true) ele.disabled = true;
		truefalse = unescape(decode64(ele.value));
		var result = '';
		var key = 'X'.charCodeAt(0);
		for (var j=0; j<truefalse.length; j++) {
			var letter = truefalse.charCodeAt(j);
			key ^= letter;
			result += String.fromCharCode(key);
		}
		truefalse = parseInt(result)%2;
		if (ele.checked==1){
			if (truefalse==0){
				ele.style.backgroundColor = "lime";
				ele.style.outline = "2px solid lime";
				ele.disabled = true;
				poss_corr++;
				act_corr++;
			}else{
				ele.style.backgroundColor = "red";
				ele.style.outline = "2px solid red";
				act_incorr++;
			}            
			suspend_string += "1";
		}
		else{
			ele.style.backgroundColor = "";
			ele.style.outline = "";
			if (truefalse==0) poss_corr++;
			suspend_string += "0";
		}
	}
	if (((num==(act_corr+act_incorr))&&(num!=poss_corr))||(act_corr==0&&act_incorr==0)){//alles ausgewählt obwohl nicht alles richtig - oder nix ausgewählt
		lmfeedback=" (Eine Entscheidung ist n&ouml;tig!)";
		for(i=0; i<num; i++){
			var ele = document.getElementById(ident+i.toString());
			ele.style.backgroundColor = "";
			ele.style.outline = "";
		}
	}
	if((act_corr-act_incorr)<0||lmfeedback!="") score=0;
	else score=act_corr-act_incorr;
	if(score==poss_corr){
		for(i=0; i<num; i++){
			var ele = document.getElementById(ident+i.toString());
			ele.disabled=true;
		}
	}
	document.getElementById('scorediv'+ident).innerHTML = "Punkte: "+score+lmfeedback;//+" von "+poss_corr;
	
	if(b_submit==true) setStatus(ident,toScorm(suspend_string),score,poss_corr);
}


// =========================================================================
// functions for various functions

// only for testing
function y(){alert("hi");}

// status for scorm-devices
function setStatus(i_ident,suspend_string,score,poss_score){
    for (var j=0; j<lm_suspend.length; j++){
    	if (i_ident==lm_suspend[j][1]){
			suspendArray[j]=suspend_string;
			ai_score[j]=score;
			ai_poss_score[j]=poss_score;
		}
    }
}


// ===========================================================================================================
//all IDevices writing SCORM suspenddata will be initialized here and have to have according entries in the switches
function initSuspendDataIDevices(){

	function fromScorm(raw_data){
		var xstring="", abc = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
		var xraw = raw_data.split(','), u=0;
		for (var i=0; i<abc.length; i++){
			if (u > xraw.length-1) break;
			if (abc[i] == xraw[u]){
				xstring += '1';
				u++;
			}else xstring += '0';
		}
		return xstring;
	}
	
	function replaceReturn(xstring){
		xstring = xstring.replace(/\r/g,"").replace(/\n/g,"");
		return xstring;
	}

	var classAttr="class", tmp, pageDivs, actnode, supnode, x, xselects, tmp, rightanswer, separator="~";
	if (navigator.appVersion.indexOf("MSIE 7")>-1||navigator.appVersion.indexOf("MSIE 6")>-1||navigator.appVersion.indexOf("MSIE 5")>-1){classAttr="className";}
	pageDivs = document.getElementsByTagName("div");
	for (var i=0; i<pageDivs.length; i++){
		x = pageDivs[i];
		switch (x.getAttribute(classAttr)){
			case "FillIn":
				actnode = pageDivs[i].firstChild;
				xselects = new Array();
				while(true){
					if (actnode.nodeName == "SELECT"){
						xselects.push(actnode);
					}
					actnode = actnode.nextSibling;
					if (actnode == undefined) break;
				}
				if (xselects.length == 0){
					supnode = pageDivs[i].firstChild;
					while(true){
						if (supnode == undefined) break;
						actnode = supnode.firstChild;
						while(true){
							if (actnode == undefined) break;
							if (actnode.nodeName == "SELECT"){
								xselects.push(actnode);
							}
							actnode = actnode.nextSibling;
						}
						supnode = supnode.nextSibling;
					}
				}
				document.getElementById("FillInScore"+x.getAttribute("id").substring(6)).innerHTML="";
				lm_suspend.push([x,x.getAttribute("id").substring(6),"FillIn",xselects]);
			break;
			case "ScormCloze":
				var x_id = pageDivs[i].getAttribute('id').substring(10);
				xselects = new Array();
				var k = 0, tmp;
				while(true){
					tmp = document.getElementById('ScormClozeBlank' + x_id + '.' + k);
					if (tmp != undefined){
							xselects.push(tmp);
					}
					else break;
					k++;
				}
				document.getElementById("ScormClozeScore"+x.getAttribute("id").substring(10)).innerHTML="";
				lm_suspend.push([x,x.getAttribute("id").substring(10),"ScormCloze",xselects]);
			break;
			case "ScormMultiSelect":
				actnode = pageDivs[i].firstChild;
				xselects = new Array();
				while(true){
					if (actnode.nodeName == "INPUT"){
						if (actnode.getAttribute("type") == "checkbox"){
							xselects.push(actnode);
							actnode.disabled=false;
						}
					}
					actnode = actnode.nextSibling;
					if (actnode == undefined) break;
				}
				if (xselects.length == 0){
					supnode = pageDivs[i].firstChild;
					while(true){
						if (supnode == undefined) break;
						actnode = supnode.firstChild;
						while(true){
							if (actnode == undefined) break;
							if (actnode.nodeName == "INPUT"){
								if (actnode.getAttribute("type") == "checkbox"){
									xselects.push(actnode);
									actnode.disabled=false;
								}
							}
							actnode = actnode.nextSibling;
						}
						supnode = supnode.nextSibling;
					}
				}
				document.getElementById("scorediv"+x.getAttribute("id").substring(16)).innerHTML="";
				lm_suspend.push([x,x.getAttribute("id").substring(16),"ScormMultiSelect",xselects]);
			break;
		}
	}
	if(lm_suspend.length>0 && lm_suspend_data!=""){
		suspendArray = lm_suspend_data.split(separator);
	    for (i=0; i<lm_suspend.length; i++){
	    	switch(lm_suspend[i][2]){
		    	case "FillIn":
					var act_corr=0;
					for (var j=0; j<lm_suspend[i][3].length; j++){
						if (suspendArray[i].charAt(j) == "1"){
							act_corr++;
							rightanswer = getFillInAnswer(lm_suspend[i][1]+'.'+j, 1).split("|")[0];
							lm_suspend[i][3][j].options[0].selected = false;
							for(var k=1; k<lm_suspend[i][3][j].options.length; k++){
								tmp = lm_suspend[i][3][j].options[k].innerHTML;
								if (replaceReturn(tmp) == replaceReturn(rightanswer)){
									lm_suspend[i][3][j].options[k].selected = true;
									markFillInWord(lm_suspend[i][3][j].options[k],2);
								}
							}
						}else{
							lm_suspend[i][3][j].options[0].selected = true;
						}
					}
					document.getElementById('FillInScore'+lm_suspend[i][1]).innerHTML = "Punkte: "+act_corr+" von "+lm_suspend[i][3].length;
				break;
		    	case "ScormCloze":
					var act_corr=0;
					for (var j=0; j<lm_suspend[i][3].length; j++){
						if (suspendArray[i].charAt(j) == "1"){
							act_corr++;
							rightanswer = getScormClozeAnswer(document.getElementById('ScormClozeBlank'+lm_suspend[i][1]+'.'+j,1));
							lm_suspend[i][3][j].value = rightanswer;
							markScormClozeWord(lm_suspend[i][3][j],2);
						}
					}
					document.getElementById('ScormClozeScore' + lm_suspend[i][1]).innerHTML = "Punkte: "+act_corr+" von "+lm_suspend[i][3].length;
				break;
		    	case "ScormMultiSelect":
					var xsuspend;
					for(j=0; j<lm_suspend[i][3].length; j++){
						var ele = lm_suspend[i][3][j];
						ele.disabled = false;
					}
					xsuspend = fromScorm(suspendArray[i]);
					for (var j=0; j<lm_suspend[i][3].length; j++){
						if (xsuspend.charAt(j) == "1") lm_suspend[i][3][j].checked = 1;
						else lm_suspend[i][3][j].checked = 0;
					}
					ScormMultiSelectSubmit(lm_suspend[i][3].length,lm_suspend[i][1],false);
				break;

				default: alert("unknown type: " + lm_suspend[i][2]);
			}
		}
	}
}

// =========================================================================
// functions for start and submit

function lmsubmithtml(buttonid,score,session_status,apiexist){
	var s_out="",triesleft=1,reloadallowed=0;
	if(apiexist==0) reloadallowed=1; 
	try{
		if(parent.parent.l){
			triesleft=parent.parent.l.j_maxattempts-parent.parent.l.i_actscormtry;
			reloadallowed=1;
		}
	}
	catch(e){}
	if(buttonid==0){
		if(triesleft>-1) s_out='<input type="button" value="Antwort abgeben" onclick="endsubmit()" style="cursor:pointer"/>';
		else s_out='Kein Versuch mehr erlaubt;';
		if(score>-1) s_out+='&nbsp;bisheriger Punktestand: '+score+'%';
	}
	if(buttonid==1){
		if(triesleft>0&&reloadallowed==1) s_out='<input type="button" value="neu laden" onclick="location.reload()" style="cursor:pointer"/>';
		if(score>-1) s_out+='&nbsp;neuer Punktestand: '+score+'%';
	}
	if(session_status=="passed") s_out+=';&nbsp;Status: bestanden';
	if(session_status=="failed") s_out+=';&nbsp;Status: nicht bestanden';
	if(session_status!="passed" && masteryscore>0) s_out+='&nbsp;('+masteryscore+'% der erzielbaren Punkte m&uuml;ssen erreicht werden)';
	s_out+='<img src="print.gif" onclick="window.print()" title="drucken" style="cursor:pointer"/><p style="font-size:80%">created with <a href="http://www.exelearningplus.de" target="_blank">eXelearningPlus</a></p>';
	document.getElementById("lmsubmit").innerHTML=s_out;
}

function doStart(){
	document.write('<div id="lmsubmit"></div>');
	try{
		loadPage();
		var score_raw=0,api = getAPIHandle(),session_status;
		if(api!=null){
			lm_suspend_data =""+doLMSGetValue("cmi.suspend_data");
			initSuspendDataIDevices();
		}
		if(lm_suspend.length>0){
			lm_scorm=true;
			if(api!=null){
				score_raw = "" + doLMSGetValue("cmi.core.score.raw");
				if(score_raw=="") score_raw=0;
				if(""+doLMSGetValue( "cmi.student_data._children" ).indexOf("mastery_score")>-1){
					var masteryscoretmp=""+doLMSGetValue( "cmi.student_data.mastery_score" );
					if (masteryscoretmp!="") masteryscore = Math.round(parseFloat(masteryscoretmp));
				}
				session_status = doLMSGetValue( "cmi.core.lesson_status" );
			}
			lmsubmithtml(0,score_raw,session_status,1);
		}
	}
	catch(e){
		initSuspendDataIDevices();
		if(lm_suspend.length>0) lmsubmithtml(0,-1,"",0);
	}
}

function endsubmit(){
	var i,score_raw=0,scoreall=0,poss_scoreall=0,separator="~",session_status;
	for (i=0; i<lm_suspend.length; i++){
		switch (lm_suspend[i][2]){
			case "FillIn":
				FillInSubmit(lm_suspend[i][1]);
			break;
			case "ScormCloze":
				ScormClozeSubmit(lm_suspend[i][1]);
			break;
			case "ScormMultiSelect":
				ScormMultiSelectSubmit(lm_suspend[i][3].length,lm_suspend[i][1],true);
			break;
		}
	
	}
    for (i=0; i<ai_score.length; i++){
		scoreall+=ai_score[i];
		poss_scoreall+=ai_poss_score[i];
	}
	score_raw=Math.round(scoreall*100/poss_scoreall);
	if(masteryscore==0)  session_status = "completed";
	else if (score_raw < masteryscore) session_status = "failed";
	else session_status = "passed";
	
	try{
		var api = getAPIHandle();
		if (api != null){
			var mode = doLMSGetValue( "cmi.core.lesson_mode" );
			if (mode != "review"  &&  mode != "browse"){
				doLMSSetValue("cmi.suspend_data", ""+suspendArray.join(separator));
				doLMSSetValue("cmi.core.score.raw", ""+score_raw);
				doLMSSetValue("cmi.core.lesson_status", session_status);
			}
//			doQuit();
			lmsubmithtml(1,score_raw,session_status,1);
		}
	}
	catch(e){
		lmsubmithtml(1,score_raw,session_status,0);
	}
}

