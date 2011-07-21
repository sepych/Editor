/*
 * Copyright (c) 2011 Evgeni Gordejev
 */

//Javascript module
var JS = {
  prettifyPattern: new RegExp(//single line comment
                              "(//.*(?=[\\n]|$))|"+
                              //multiline comment
                              "(/\\*.*?($|\\*/))|"+
                              //single or double quote strings
                              "((?:\"[^\"\\\\]*(?:\\\\.[^\"\\\\]*)*\")|(?:'[^'\\\\]*(?:\\\\.[^'\\\\]*)*'))|"+
                              //regular expression literal in javascript code(not perfect)
                              "((?:[/].+[/])[img]{0,3}(?=[\\s]*(?:[;]|[,]|[\\x5d]|[\\x29]|[\\x2e]|[\\n])))|"+
                              //keywords
                              "(\\b(?:break|continue|do|else|for|if|return|while|var|function|new)\\b)|"+
                              //numbers
                              "(\\b(?:(?:[0-9]*\\.)?[0-9]+(?:[eE][-+]?[0-9]+)?)|(?:undefined|null)\\b)|"+
                              //methods
                              "(?:[.]([\\w]+)(?=[(]))", 'g'),
  prettifyInit: function(){
    this.multilineComment = false;
  },
  prettify: function(str){
    var self = this;
    var lines = htmlspecialchars(str).split('\n');
    var str;
    for(var i = 0; i < lines.length; i++){
      str = lines[i];
      lines[i] = '';
      if(this.multilineComment){
        var commentEnding = str.search(/[\\*][/]/);
        if(commentEnding != -1){ //multiline comment ends
          this.multilineComment = false;
          lines[i] = '<span class="comment">'+str.slice(0,commentEnding+2)+'</span>';
          str = str.slice(commentEnding+2);
        }else{
          lines[i] = str.replace(/^(.*)$/g, '<span class="comment">$1</span>');
          continue;
        }
      }
      lines[i] += str.replace(this.prettifyPattern, function(subStr, p1, p2, p2end, p3, p4, p5, p6, p7){
        if(p1 != undefined){
          return '<span class="comment">'+subStr+'</span>';
        }else if(p2 != undefined){
          if(p2end != '*/'){
            self.multilineComment = true;
          }
          return '<span class="comment">'+subStr+'</span>';
        }else if(p3 != undefined){
          return '<span class="string">'+subStr+'</span>';
        }else if(p4 != undefined){
          return '<span class="string">'+subStr+'</span>';
        }else if(p5 != undefined){
          return '<span class="keyword">'+subStr+'</span>';
        }else if(p6 != undefined){
          return '<span class="number">'+subStr+'</span>';
        }else if(p7 != undefined){
          return '.<span class="method">'+p7+'</span>';
        }
      });
    }
    return lines.join('\n');
  },
  indentPattern: new RegExp(//single line comment
                               "(?://.*$)|"+
                               //multiline comment
                               "(/\\*.*?($|\\*/))|"+
                               //single or double quote strings
                               "(?:(?:\"[^\"\\\\]*(?:\\\\.[^\"\\\\]*)*\")|(?:'[^'\\\\]*(?:\\\\.[^'\\\\]*)*'))|"+
                               //regular expression literal in javascript code(not perfect)
                               "(?:(?:[/].+[/])[img]{0,3}(?=[\\s]*(?:[;]|[,]|[\\x5d]|[\\x29]|[\\x2e]|[\\n])))|"+
                               //brackets
                               "([{]|[(]|[\[])|([}]|[)]|[\\]])", 'g'),
  stripSpacesPattern: new RegExp("(?:^(?:\\s*(?: )*)+)|(?:(?:\\s*(?: )*)+$)"),
  exceptionPattern: new RegExp("(?:(?:\\b(?:if|for|while)\\b\\s*[(].*[)])|\\b(?:else|do)\\b)\\s*$"),
  indentInit: function(indentSize, offset){
    this.indentSize = indentSize;
    this.nextLine = offset;
    this.brackets = [{next:0, diff:0}];
    this.indentException = 0;
    this.multilineComment = false;
  },
  //Strict rules of indent algorithm:
  // 1.indentation of lines inside '{}' and '[]' is offset+indentation_size 
  // 2.indentation of lines inside '()' is position of '(' 
  // 3.first rule overrides second rule if '{' is inside '()' and '{' is located on the same line with '('
  // 4.conditional statement without following '{' indents next line as offset+indentation_size
  indentOffset: function(str){
    var self = this;
    str = str.replace(this.stripSpacesPattern,'');
    if(this.multilineComment){
      var commentEnding = str.search(/[\\*][/]/);
      if(commentEnding != -1){ //multiline comment ends, replace it with dummy characters
        this.multilineComment = false;
        str = str.replace(new RegExp(".{"+commentEnding+"}"),'0');
      }else{ //replace comment line with dummy characters
        str = str.replace(/./g, '0');
      }
    }
    
    var result = 0;
    var size = this.brackets.length;
    var prevOffset = this.brackets[size-1].next;
    str.replace(this.indentPattern, function(m, c1, cEnd1, b1, b2, matchOffset){
      if(c1 != undefined && cEnd1 != '*/'){
        self.multilineComment = true;
      }else if(b1 != undefined){ //opening brackets
        var offset = {next:0, diff:0};
        if(b1 == '(' /*|| b1 == '['*/){ //parenthesis indentation depend on previous parenthesis indentation and its own offset
          offset.diff = (self.nextLine < prevOffset)?0:self.nextLine-prevOffset;
          offset.next = matchOffset+self.nextLine;
        }else{ //normal indentation for curly braces and square brackets
          offset.diff = self.indentSize;
          offset.next = self.nextLine+self.indentSize;
          if( self.indentException > 0 && b1 == '{'){ //exception case
            //if on the next line of the conditional statement is curly brace, indendation is normalized
            if( str.slice(0,matchOffset).search(/^\s*$/) != -1){ //only white spaces are allowed before curly brace
              self.indentException = 0;
            }
          }
        }
        self.brackets.push(offset);
      }else if(b2 != undefined){ //closing brackets
        //trick, last item of the array is always defined
        if(self.brackets.length > 1){ 
          if(size == self.brackets.length){
            self.nextLine -= self.brackets[self.brackets.length-1].diff;
          }
          self.brackets.pop();
        }
      }
    });
    result = this.nextLine+this.indentException;
    this.nextLine = this.brackets[this.brackets.length-1].next;
    this.indentException = (str.search(this.exceptionPattern) != -1)?this.indentSize:0;
    return result;
  }
};
