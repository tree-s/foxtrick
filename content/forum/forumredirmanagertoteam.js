/**
 * forumredirmanagertoteam.js
 * Foxtrick redirect from manager to team page
 * @author convinced
 */

var FoxtrickForumRedirManagerToTeam = {
	
    MODULE_NAME : "ForumRedirManagerToTeam",
	MODULE_CATEGORY : Foxtrick.moduleCategories.FORUM,
	DEFAULT_ENABLED : false,

	init : function() {
            Foxtrick.registerPageHandler( 'forumViewThread',
                                          FoxtrickForumRedirManagerToTeam);
            Foxtrick.registerPageHandler( 'teamPageGeneral',
                                          FoxtrickForumRedirManagerToTeam);
    },

    run : function( page, doc ) { 
		// manager to team in forum
		if (doc.location.href.search(/\/Forum\/Read/i)!=-1 ) {	 
			var body = doc.getElementById("mainBody");
			if (body != null) {
				var alldivs = getElementsByClass("cfHeader", body);
				for (var i = 0; i < alldivs.length; i++) {
				var linksArray = alldivs[i].getElementsByTagName('a');
				    for (var j=0; j<linksArray.length; j++) {
					  var link = linksArray[j];
					  if (link.href.search(/userId=/i) > -1 
						&& link.href.search(/ft_popuplink=true/i)==-1 
						&& link.href.search(/redir_to_league=true/i)==-1) { 
						
							link.href+="&redir_to_team=true";
					  }
					}
				  }
				}
			}
		// manager to team for last visitors
		else if (doc.location.href.search('\/Club\/|\/World\/Series\/')!=-1 ) {	
			var alldivs = doc.getElementsByTagName('div');
			for (var j = 0; j < alldivs.length; j++) {
				if (alldivs[j].className=="sidebarBox") { 
					var header = alldivs[j].getElementsByTagName("h2")[0];
					if (header.innerHTML == Foxtrickl10n.getString("foxtrick.tweaks.recentvisitors")) {
						var linksArray = alldivs[j].getElementsByTagName('a'); 
						for (var k=0; k<linksArray.length; k++) {
							var link = linksArray[k];
							if (link.href.search(/userId=/i) > -1) { 
								link.href+="&redir_to_team=true"; 
							}
						}
						break;
					}
				}
			}	
	    }			
    },
	
	change : function( page, doc ) {
	},
};