/*
 * Copyright (c) 2011 Evgeni Gordejev
 */

//TODO multiline comments and bugs
var HTML = {
  prettifyPattern: new RegExp("(<(?:/)?(?:\\w+))((?:\\s+\\w+(?:\\s*=\\s*(?:\".*?\"|'.*?'|[^'\">\\s]+))?)+\\s*|\\s*)((?:/)?>)",'g'),
  prettifyInit: function(){},
  prettify: function(str){
    var lines = str.split('\n');
    var hstr;
    for(var i = 0; i < lines.length; i++){

      lines[i] = lines[i].replace(this.prettifyPattern, function(subStr, p1, p2, p3){
        hstr = '';
        if(p1 != undefined && p3 != undefined){
          hstr = '<span class="tag">'+htmlspecialchars(p1)+'</span>';
          if(p2 != undefined){
            hstr += '<span class="keyword">'+htmlspecialchars(p2)+'</span>';
          }
          hstr += '<span class="tag">'+htmlspecialchars(p3)+'</span>';
        }
        return hstr;
      });
    }
    return lines.join('\n');
  },
  indentPattern: new RegExp("<(/)?(\\w+)(?:(?:\\s+\\w+(?:\\s*=\\s*(?:\".*?\"|'.*?'|[^'\">\\s]+))?)+\\s*|\\s*)(/)?>",'g'),
  stripSpacesPattern: new RegExp("(?:^(?:\\s*(?: )*)+)|(?:(?:\\s*(?: )*)+$)"),
  indentInit: function(indentSize, offset){
    this.indentSize = indentSize;
    this.nextLine = offset;
    this.brackets = [{next:0, diff:0}];
    this.indentException = 0;
    this.multilineComment = false;
  },
  indentOffset: function(str){
    var self = this;
    str = str.replace(this.stripSpacesPattern,'');
    var result = 0;
    var size = this.brackets.length;
    var prevOffset = this.brackets[size-1].next;
    str.replace(this.indentPattern, function(m, closing, tagName, selfClosing){
      if(closing == '/'){ //closing
        if(tagName.search(/^script$/i) != -1){
          self.script = false;
        }
        if(self.script)return;
        //trick, last item of the array is always defined
        if(self.brackets.length > 1){ 
          if(size == self.brackets.length){
            self.nextLine -= self.brackets[self.brackets.length-1].diff;
          }
          self.brackets.pop();
        }
      }else if(selfClosing == '/'){
      
      }else{ //opening tag
        if(self.script)return;
        
        if(tagName.search(/^script$/i) != -1){
          self.script = true;
        }
        var offset = {next:0, diff:0};
        offset.diff = self.indentSize;
        offset.next = self.nextLine+self.indentSize;
        self.brackets.push(offset);
      }
    });
    result = this.nextLine;
    this.nextLine = this.brackets[this.brackets.length-1].next;
    return result;
  }
}
