/***************************************************************************
Name: Qupint
Version: 0.6
Author: Benoit Bailleux
Email:  benoit . bailleux (a) gmail . com

Quick URL paste in new tab

Copyright (C) 2011 - 2012 Benoit Bailleux

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to:

Free Software Foundation, Inc.
51 Franklin Street
Fifth Floor
Boston, MA  02110-1301
USA
***************************************************************************/

var qupint_prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
var qupint = {
  // Localized messages :
  strings: null,
  // How long should be displyed the warning notification :
  WARN_DURATION: 5000,
  
  /** Find the initial window, containing the status bar and the main interface
   *  for this browser
   */
  getInitialWindow: function(win) {
      for (; win; win = win.opener) {
        if (!win.opener || win == win.opener || !(win.opener instanceof Window) )
          return win.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIWebNavigation)
                   .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIDOMWindow);
      }
      return null;
  },
  
  option_changeAccessKey : function(key, shift) {
    // Find the right window ;
    var mainWindow = qupint.getInitialWindow(window.opener);
    if (! mainWindow) mainWindow = window;
    var ksparent = mainWindow.document.getElementById('main-window');
    // Gets the <keyset> :
    var mainKeySet = mainWindow.document.getElementById('qupint_keyset');
    // gets default shortkey value if needed :
    if ( key === null)
      key = qupint_prefManager.getCharPref("extensions.qupint.shortCutValue");
    if ( shift === null)
      shift = qupint_prefManager.getBoolPref("extensions.qupint.shortCutShiftModifier");
    // Replace the keyset with a new one (otherwise : doesn't work)
    if (mainKeySet) ksparent.removeChild(mainKeySet);
    mainKeySet = document.createElement('keyset');
    mainKeySet.id = 'qupint_keyset';
    // Create shortcut :
    var keyelem = document.createElement('key');
    keyelem.setAttribute('id', 'qupint_action');
    keyelem.setAttribute('oncommand', 'qupint.doIt();');
    keyelem.setAttribute('key', key);
    if (shift)
      keyelem.setAttribute('modifiers', 'shift accel');
    else
      keyelem.setAttribute('modifiers', 'accel');
    mainKeySet.appendChild(keyelem);
    // Add the new <keyset> to the browser :
    ksparent.appendChild(mainKeySet);
  },

  
  onLoad: function() {
    // Keyboard shortcut :
    qupint.option_changeAccessKey(null, null);
    this.strings = document.getElementById("qupint-strings");
  },
  
  doIt: function() {
    var useSel = qupint_prefManager.getBoolPref('extensions.qupint.useSelection');
    var selBeforeClip = qupint_prefManager.getBoolPref('extensions.qupint.selectionBeforeClipboard');
    var u = "";
    if(useSel && selBeforeClip) {
      u = content.window.getSelection().toString();
      if (!u || u == "")
        u = readFromClipboard();
    } else {
      u = readFromClipboard();
      if (!u || u == "")
        u = content.window.getSelection().toString();
    }
    
    const nsIURIFixup = Components.interfaces.nsIURIFixup;
    var gURIFixup = Components.classes["@mozilla.org/docshell/urifixup;1"].getService(nsIURIFixup);
    var url = null;
    // Message if clipboard content cannot be exploited :
    var message = this.strings.getString("extensions.qupint.badContentMsg");
    try {
      url = gURIFixup.createFixupURI(u, nsIURIFixup.FIXUP_FLAG_ALLOW_KEYWORD_LOOKUP);
      if (url) {
        var ct = gBrowser.addTab(url.spec);
        gBrowser.selectedTab = ct;
      } else
        alert(message);
    } catch (ex) {
      // If the clipboard content cannot be used :
      var nb = gBrowser.getNotificationBox();
      var n = nb.getNotificationWithValue('qupint-notUri');
      // Re-use or create a notification box
      if(n) {
        n.label = message;
      } else {
        // Display a notification
        const priority = nb.PRIORITY_WARNING_LOW;
        n = nb.appendNotification(message, 'qupint-notUri',
                                 'chrome://browser/skin/Info.png',
                                  priority, null);
      }
      // The notification box is displayed for at most WARN_DURATION milliseconds
      var timer = Components.classes["@mozilla.org/timer;1"]
                   .createInstance(Components.interfaces.nsITimer);
      var callB = {
        notify: function(timer) {
          var nb = gBrowser.getNotificationBox();
          var n = nb.getNotificationWithValue('qupint-notUri');
          nb.removeNotification(n);
        }
      }
      timer.initWithCallback(callB, this.WARN_DURATION, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    }
    
    
  }
};

window.addEventListener("load", function () { qupint.onLoad(); }, false);
