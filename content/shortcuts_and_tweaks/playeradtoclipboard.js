/**
 * playeradtoclipboard.js
 * Copies a player ad to the clipboard
 * @author larsw84, ryanli
 */

 ////////////////////////////////////////////////////////////////////////////////
var FoxtrickPlayerAdToClipboard = {

	MODULE_NAME : "CopyPlayerAdToClipboard",
	MODULE_CATEGORY : Foxtrick.moduleCategories.SHORTCUTS_AND_TWEAKS,
	PAGES : ["playerdetail", "youthplayerdetail"],
	DEFAULT_ENABLED : true,
	NEW_AFTER_VERSION : "0.5.2.1",
	LATEST_CHANGE : "Now supporting youth players.",
	LATEST_CHANGE_CATEGORY : Foxtrick.latestChangeCategories.NEW,

	init : function() {
	},

	run : function(page, doc) {
		try {
			var main = doc.getElementById("mainWrapper");
			var links = main.getElementsByTagName("a");
			var empty = true;
			for (var i = 0; i < links.length; i++) {
				if (links[i].href.match(/Club\/\?TeamID/i)
					|| links[i].href.match(/Youth\/Default\.aspx\?YouthTeamID=/i)) {
					empty = false;
					break;
				}
			}
			if (empty) {
				return;
			}
		}
		catch (e) {
			return;
		}

		if (FoxtrickPrefs.getBool("smallcopyicons")) {
			if (doc.getElementById('copyplayerad')) return;
			var boxHead = doc.getElementById('mainWrapper').getElementsByTagName('div')[1];
			if (boxHead.className!='boxHead') return;

			if (Foxtrick.isStandardLayout(doc)) doc.getElementById('mainBody').setAttribute('style','padding-top:10px;');

			var messageLink = doc.createElement("a");
			messageLink.className = "inner copyicon copyplayerad ci_fourth";
			messageLink.title = Foxtrickl10n.getString("foxtrick.tweaks.copyplayerad");
			messageLink.id = "copyplayerad";
			messageLink.addEventListener("click", this.createPlayerAd, false);

			var img = doc.createElement("img");
			img.alt = Foxtrickl10n.getString("foxtrick.tweaks.copyplayerad");
			img.src = Foxtrick.ResourcePath+"resources/img/transparent.gif";

			messageLink.appendChild(img);
			doc.getElementById('mainBody').insertBefore(messageLink, doc.getElementById('mainBody').firstChild);
		}
		else {
			var parentDiv = doc.createElement("div");
			parentDiv.id = "foxtrick_addactionsbox_parentDiv";

			var messageLink = doc.createElement("a");
			messageLink.className = "inner";
			messageLink.title = Foxtrickl10n.getString("foxtrick.tweaks.copyplayerad");
			messageLink.style.cursor = "pointer";
			messageLink.addEventListener("click", this.createPlayerAd, false)

			var img = doc.createElement("img");
			img.style.padding = "0px 5px 0px 0px;";
			img.className = "actionIcon";
			img.alt = Foxtrickl10n.getString("foxtrick.tweaks.copyplayerad");
			img.src = Foxtrick.ResourcePath+"resources/img/copy/copyPlayerAd.png";
			messageLink.appendChild(img);

			parentDiv.appendChild(messageLink);

			var newBoxId = "foxtrick_actions_box";
			Foxtrick.addBoxToSidebar(doc, Foxtrickl10n.getString(
				"foxtrick.tweaks.actions"), parentDiv, newBoxId, "first", "");
		}
	},

	change : function(page, doc) {
		var id = "foxtrick_addactionsbox_parentDiv";
		if (!doc.getElementById(id)) {
			this.run(page, doc);
		}
	},

	createPlayerAd : function(ev) {
		var doc = ev.target.ownerDocument;
		var isSenior = Foxtrick.Pages.Player.isSeniorPlayerPage(doc);
		try {
			var ad = "";

			ad += Foxtrick.Pages.Player.getName(doc);
			if (isSenior) {
				ad += " [playerid=" + Foxtrick.Pages.Player.getId(doc) + "]\n";
			}
			else {
				ad += " [youthplayerid=" + Foxtrick.Pages.Player.getId(doc) + "]\n";
			}

			//nationality, age and next birthday
			var byLine = doc.getElementsByClassName("byline")[0];
			// add new lines before <p> so that textContent would have breaks
			// at <p>s.
			var byLinePars = byLine.getElementsByTagName("p");
			for (var i = 0; i < byLinePars.length; ++i) {
				byLinePars[i].parentNode.insertBefore(doc.createTextNode("\n"), byLinePars[i]);
			}
			ad += Foxtrick.trim(byLine.textContent) + "\n\n";

			if (Foxtrick.Pages.Player.getNationalityName(doc) !== null) {
				ad += Foxtrickl10n.getString("foxtrick.tweaks.bornin");
				ad += ": " + Foxtrick.Pages.Player.getNationalityName(doc) + "\n\n";
			}

			var playerInfo = doc.getElementsByClassName("playerInfo")[0];

			// basic information
			// for senior players:
			// form, stamina, experience, leadership, personality (always there)
			// for youth players:
			// speciality (only when he has a speciality)
			var basicInfo = playerInfo.getElementsByTagName("p")[0];
			if (basicInfo) {
				if (isSenior) {
					// add new lines before <br> so that textContent would have breaks
					// at <br>s.
					var basicInfoBreaks = basicInfo.getElementsByTagName("br");
					for (var i = 0; i < basicInfoBreaks.length; ++i) {
						basicInfoBreaks[i].parentNode.insertBefore(doc.createTextNode("\n"), basicInfoBreaks[i]);
					}
					ad += Foxtrick.trim(basicInfo.textContent) + "\n\n";
				}
				else {
					var speciality = Foxtrick.trim(basicInfo.textContent);
					// we will bold the speciality part, right after
					// colon plus space
					var colonRe = new RegExp(":\\s*");
					var colonIndex = speciality.search(colonRe);
					var colonLength = speciality.match(colonRe)[0].length;
					ad += speciality.substr(0, colonIndex + colonLength)
						+ "[b]" + speciality.substr(colonIndex + colonLength, speciality.length) + "[/b]"
						+ "\n\n";
				}
			}

			// owner, TSI wage, etc.
			var table = playerInfo.getElementsByTagName("table")[0];
			if (table) {
				for (var i = 0; i < table.rows.length; i++) {
					ad += Foxtrick.trim(table.rows[i].cells[0].textContent) + " ";
					// remove teampopuplinks
					var cellCopy = table.rows[i].cells[1].cloneNode(true);
					var popupLinks = cellCopy.getElementsByTagName("a");
					for (var j = 1; j < popupLinks.length; j++) {
						popupLinks[j].innerHTML = "";
					}
					// bolding for speciality
					ad += (i==5?"[b]":"") + Foxtrick.trim(cellCopy.textContent.replace(/\n/g,"").replace(/\s+/g, " "))
						+ (i==5?"[/b]":"") + "\n";
				}
				ad += "\n";
			}

			var formatSkill = function(text, value) {
				if (value > 5) {
					return "[b]" + text + "[/b]";
				}
				else if (value == 5) {
					return "[i]" + text + "[/i]";
				}
				return text;
			};

			// skills
			var skills = Foxtrick.Pages.Player.getSkills(doc);
			if (skills !== null) {
				for (var i in skills.names) {
					if (isSenior) {
						ad += skills.names[i] + ": "
							+ formatSkill(skills.texts[i], skills.values[i])
							+ "\n";
					}
					else {
						ad += formatSkill(skills.names[i], Math.max(skills.values[i].current, skills.values[i].max)) + ": "
							+ (skills.values[i].maxed ? "[b]" : "")
							+ skills.texts[i].current
							+ " / "
							+ skills.texts[i].max
							+ (skills.values[i].maxed ? "[/b]" : "")
							+ "\n";
					}
				}
			}

			// current bid information
			var bidDiv = doc.getElementById("ctl00_CPMain_updBid");
			if (bidDiv) {
				ad += "\n";
				var paragraphs = bidDiv.getElementsByTagName("p");
				for (var i = 0; i < paragraphs.length; i++) {
					var cellCopy = paragraphs[i].cloneNode(true);
					var popupLinks = cellCopy.getElementsByTagName("a");
					for (var j = 1; j < popupLinks.length; j++) {
						popupLinks[j].innerHTML = "";
					}
					ad += Foxtrick.trim(cellCopy.textContent);
					ad += "\n";
				}
			}

			Foxtrick.copyStringToClipboard(ad);
			var note = Foxtrick.Note.create(doc, "ft-playerad-copy-note", Foxtrickl10n.getString("foxtrick.tweaks.copied"), null, true);
			var noteArea = Foxtrick.Note.getNoteArea(doc);
			noteArea.appendChild(note);
		}
		catch (e) {
			Foxtrick.alert('createPlayerAd '+e);
		}
	}
};
