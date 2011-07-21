/*!
 * HTML5 editor - 0.0.1
 *
 * Copyright (c) 2011 Evgeni Gordejev
 */
function htmlspecialchars(str){
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getFirstTextNode(node){
  if(node.nodeType == 3){
    return node;
  }else{
    var iter = node.firstChild;
    while(iter){
      if(iter.nodeType == 3){
        return iter;
      }
      iter = iter.nextSibling;
    }
  }
  return null;
}

//slightly faster than native innerHTML method
function replaceHtml(oldNode, html) {
  var newNode = oldNode.cloneNode(false);
  newNode.innerHTML = html;
  oldNode.parentNode.replaceChild(newNode, oldNode);
  return newNode;
}

//handy module loader
function loadModule(obj, values){
  for(var property in values){
    if(values.hasOwnProperty(property)){
      obj[property] = values[property];
    }
  }
}



function TextEngine(container){
  this.range = document.createRange();
  this.elem = container;
  this.eof = true;
  this.startLine = false;
  this.startNode;
  //inits selection
  this.initSelection = function(){
    this.currentNode = getFirstTextNode(this.elem);
    this.currentOffset = 0;
    this.range.setStart(this.currentNode,this.currentOffset);
    this.eof = false;
    this.startLine = true;
  }
  
  
  //selects line depending on cursor
  //returns cursor position
  this.lineByCursorPos = function(cursorNode, cursorOffset){
    this.currentOffset = cursorOffset;
    //new line character's parent is always contenteditable element,this is strict rule
    while(cursorNode.parentNode != this.elem){
      cursorNode = cursorNode.parentNode;
      this.currentOffset = -1;
    }
    
    var cursorPos = 0;
    var node = cursorNode;
    var str,pos,offset;
    offset = this.currentOffset;
    //searching start of the line
    while(node){
      if(node.nodeType == 3){
        str = node.nodeValue;
        if(offset != -1){
          str = str.slice(0, offset);
        }
        
        pos = str.lastIndexOf('\n');
        if(pos != -1){
          this.range.setStart(node,pos+1);
          cursorPos += str.length-pos-1;
          break;
        }else{
          cursorPos += str.length;
          offset = -1;
        }
      }else if(node.nodeType == 1){
        if(node == cursorNode){
          cursorPos += cursorOffset;
        }else{
          cursorPos += node.textContent.length;
        }
        
      }
      
      if(!node.previousSibling){
        this.range.setStart(node,0);
        break;
      }
      node = node.previousSibling;
    }
    
    node = cursorNode;
    offset = this.currentOffset;
    //searching end of the line
    while(node){
      if(node.nodeType == 3){
        str = node.nodeValue;
        if(offset != -1){
          str = str.slice(offset);
        }
        pos = str.indexOf('\n');
        if(pos != -1){
          this.range.setEnd(node,(offset != -1)?offset+pos:pos);
          break;
        }else{
          offset = -1;
        }
      }
      
      if(!node.nextSibling){
        if(node.nodeType == 3){
          this.range.setEnd(node,node.nodeValue.length);
        }else if(node.nodeType == 1){
          this.range.setEnd(node,1);
        }
        break;
      }
      node = node.nextSibling;
    }
    //str = this.range.cloneContents().textContent;
    return cursorPos;
  };
  
  
  
  //selects next number of lines
  //returns true if lines are found
  this.nextLines = function(num){
    var node = this.currentNode;
    while(node.nextSibling){
      this.currentNode = node;
      if(node.nodeType == 3){
        str = node.nodeValue;
        if(this.currentOffset){
          str = str.slice(this.currentOffset);
        }
        
        pos = str.indexOf('\n');
        if(pos != -1){
          this.currentOffset += pos;
          if(!this.startLine){
            this.currentOffset++;
            this.range.setStart(this.currentNode,this.currentOffset);
            this.startLine = true;
            continue;
          }else{
            num--;
            if(num != 0){
              this.currentOffset++;
              continue;
            }
            this.range.setEnd(this.currentNode,this.currentOffset);
            this.startLine = false;
            return true;
          }
        }else{
          this.currentOffset = 0;
        }
      }
      node = node.nextSibling;
    }
    this.eof = true;
    if(this.currentNode && this.startLine){
      node = this.currentNode;
      if(node.nodeType == 3){
        this.range.setEnd(node,node.nodeValue.length);
      }else if(node.nodeType == 1){
        this.range.setEnd(node,getFirstTextNode(node)?1:0);
      }else{
        return false;
      }
    }else{
      return false;
    }
    return true;
  };
  
  //returns range by cursor position, 
  //starts searching from the beginning of current line
  this.getRangeByCursor = function(cursorPos){
    var node = this.startNode;
    var offset = 0;
    var textNode;
    while(node){
      textNode = getFirstTextNode(node);
      offset += textNode.nodeValue.length;
      if(offset >= cursorPos){
        var range = document.createRange();
        var pos = textNode.nodeValue.length-offset+cursorPos;
        range.setEnd(textNode,pos);
        range.collapse(false);
        return range;
      }
      node = node.nextSibling;
    }
    return null;
  };
  
  //replace current selection with new html string
  this.setLine = function(html){
    this.currentOffset = 0;
    this.range.deleteContents();
    if(html.length){
      this.range.deleteContents();
      
      var frag = document.createDocumentFragment();
      var dummy = document.createElement('span');
      dummy.innerHTML = html;
      frag.appendChild(dummy);
      
      //unwrap
      for(var i = 0; dummy.childNodes[i]; i++){
        frag.appendChild(dummy.childNodes[i].cloneNode(true));
      }
      frag.removeChild(dummy);
      
      this.currentNode = frag.lastChild;
      this.startNode = frag.firstChild;
      this.range.insertNode(frag);
    }else{
      this.range.deleteContents();
      this.currentNode = document.createTextNode('');
      this.startNode = this.currentNode;
      this.range.insertNode(this.currentNode);
    }
  };
  
  //returns selection html string
  this.getLineHTML = function(){
    var frag = this.range.cloneContents();
    var div = document.createElement('div');
    div.appendChild(frag);
    return div.innerHTML;
  };
  
  //returns selection text
  this.getLineText = function(){
    return this.range.cloneContents().textContent;
  };
  
  //sets selection
  this.setRange = function(range){
    this.range = range;
  };
  
  //gets selection
  this.getRange = function(){
    return this.range;
  };
}




function Editor(elementId, module){
  //---------------------------------------------------------------
  //------------------module template start------------------------
  var TEMPLATE = {
    prettifyInit: function(){},
    prettify: function(str){return str},
    indentInit: function(indentSize, offset){},
    indentOffset: function(str){return 0}
  };
  //-------------------module template end-------------------------
  //---------------------------------------------------------------
  
  
  var self = this;
  //editor's container element
  this.elem = document.getElementById(elementId);
  this.elem.appendChild(document.createTextNode(''));
  this.textEngine = new TextEngine(this.elem);
  

  
  //---------------------------------------------------------------
  //---------------------main program start------------------------
  loadModule(this, TEMPLATE);
  loadModule(this, module);

  
  this.selection = window.getSelection();
  this.elem.addEventListener("keydown", function(event){
    if(event.keyCode == 13){
      event.preventDefault();
      var range = self.selection.getRangeAt(0);
      var node = range.startContainer;
      var offset = range.startOffset;
      if(node.parentNode != self.elem){
        var textNode = node.cloneNode(true);
        var str = textNode.nodeValue;
        textNode.nodeValue = str.slice(0,offset)+'\n'+str.slice(offset);
        node = node.parentNode;
        node.parentNode.insertBefore(textNode, node);
        node.parentNode.removeChild(node);
        range.setStart(textNode,offset+1);
        range.setEnd(textNode,offset+1);
      }else{
        range.insertNode(document.createTextNode('\n'));
      }
      range.collapse(false);
      self.selection.removeAllRanges();
      self.selection.addRange(range);
    }
  });
  
  //automatic highlighting on keyup event
  this.elem.addEventListener("keyup", function(){
    var node = self.selection.anchorNode;
    var localPos = self.textEngine.lineByCursorPos(node,self.selection.anchorOffset);
    
    var unmodified = self.textEngine.getLineHTML();
    //TODO recognize multiline comment
    self.prettifyInit();
    var modified = self.prettify(self.textEngine.getLineText());
    if(unmodified == modified){
      return;    
    }
    self.textEngine.setLine(modified);
    
    var range = self.textEngine.getRangeByCursor(localPos);
    if(range){
      self.selection.removeAllRanges();
      //when document is big, addrange method is quite slow
      self.selection.addRange(range);
    }
  });
  
  this.elem.addEventListener("paste", function(event){
    event.preventDefault();
    var paste = event.clipboardData.getData ? event.clipboardData.getData('text/plain') : false;
    if(paste) {
      //TODO clean start node and end node
      self.textEngine.setRange(self.selection.getRangeAt(0));
      self.textEngine.setLine(htmlspecialchars(paste));
      var range = self.textEngine.getRange();
      range.collapse(false);
      self.selection.removeAllRanges();
      self.selection.addRange(range);
      
      setTimeout(function(){
        self.highlight();
      },50);
    }
  });
  
  this.indent = function(){
    var startSpacesPattern = new RegExp("^(\\s*(&nbsp;)*)+");
    this.indentInit(2,0);
    var pos,val,str;
    var spPattern = new RegExp("\\S");
    var res = []
    var ts = new Date();
    ts = ts.getTime();
    this.textEngine.initSelection();
    while(!this.textEngine.eof){
      this.textEngine.nextLines(1);
      str = this.textEngine.getLineText();
      pos = str.search(spPattern);
      val = this.indentOffset(str);
      if(pos != val){
        var intendStr = '';
        for(var j = 0; j < val; ++j){
          intendStr += ' ';
        }
        this.textEngine.setLine(intendStr+this.textEngine.getLineHTML().replace(startSpacesPattern,''));
        //res.push(intendStr+str.replace(startSpacesPattern,''));
        //this.setLine(intendStr+str.replace(startSpacesPattern,''));
      }else{
        //res.push(str);
      }
    }
    
    //this.elem = replaceHtml(this.elem,htmlspecialchars(res.join('\n')));
    
    
    var te = new Date();
    te = te.getTime();
    console.log('time(ms)',te-ts);
    setTimeout(function(){
      self.highlight();
    },50);
  }
  
  this.highlight = function(){
    var ts = new Date();
    ts = ts.getTime();
    this.prettifyInit();
    this.textEngine.initSelection();
    while(!this.textEngine.eof){
      //TODO highlight by lines
      this.textEngine.nextLines(100);
      var unmodified = this.textEngine.getLineHTML();
      
      //var modified = this.prettify(htmlspecialchars(this.textEngine.getLineText()));
      var modified = this.prettify(this.textEngine.getLineText());
  
      if(unmodified != modified){ 
        this.textEngine.setLine(modified);
      }
    }
    
    var te = new Date();
    te = te.getTime();
    console.log('time(ms)',te-ts);
  }
  //-----------------------main program end------------------------
  //---------------------------------------------------------------
};
