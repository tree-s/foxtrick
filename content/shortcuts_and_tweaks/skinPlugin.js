/**
 * skinPlugin.js
 * Script which including skins
 *chrome://foxtrick/content/resources/css/mainr.css
 * @author smates
 */
var FoxtrickSkinPlugin = {
    
  MODULE_NAME : "SkinPlugin",
	MODULE_CATEGORY : Foxtrick.moduleCategories.SHORTCUTS_AND_TWEAKS,
	DEFAULT_ENABLED : true,
  OPTIONS : {},
  
    init : function() {
        Foxtrick.registerPageHandler('all',this);
            this.initOptions();
    },

    run : function( page, doc ) {  
		
	try {
var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"].getService(Components.interfaces.nsIStyleSheetService);
var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);


var uri = ios.newURI(FoxtrickPrefs.getString("cssSkin"), null, null);

       
       if (!Foxtrick.isModuleFeatureEnabled( this, "ActiveSkin")){sss.unregisterSheet(uri, sss.USER_SHEET);}
       if (FoxtrickPrefs.getBool("module.SkinPlugin.enabled")){
       
		   sss.loadAndRegisterSheet(uri, sss.USER_SHEET);

		/*OLD MEDALS SCRIPT*/
		var sidebar = doc.getElementById('sidebar');
		if( sidebar ) {
			var images = sidebar.getElementsByTagName('img');
			for(var i = 0; i < images.length; i++) {
				var img = images[i];
				var imgSrc = img.src;
				var customMedals = "oldhtmedals";
				var oldString = "Trophy";
				var newString = "chrome://foxtrick/content/resources/img/"
					+ "custommedals/" + customMedals + "/";
				if(imgSrc.search(oldString) != -1) {
					var startPos = imgSrc.lastIndexOf("=") + 1;
					imgSrc = imgSrc.substr(startPos);
					imgSrc = imgSrc.replace("png","gif");
					img.src = newString + imgSrc;
				}
			}
		}
		/*END*/
		}
		if (!Foxtrick.isModuleFeatureEnabled( this, "ActiveSkin")){sss.unregisterSheet(uri, sss.USER_SHEET);}
		} catch(e){}
	},

		
	
	change : function( page, doc ) {
	
	},
	initOptions : function() {
        
		this.OPTIONS = new Array( 
                                    "ActiveSkin"
                                    
								);
	}
	
	
};




