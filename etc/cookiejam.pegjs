{
    function mergeModifier(modifier, result) {
        if (modifier.indexOf("generic_") != -1) {
        	result.generic = true;
            return;
        }

        if (modifier.indexOf("_holder") != -1) {
        	result.holder = true;
            return;
        }

        if (modifier.indexOf("_instance") != -1) {
        	result.instance = true;
            return;
        }
        
        if(result.type == "Class") return;
        if(result.type == "ScaleButton") return;
        if(result.type == "ScaleButtonIcons") return;
        if(result.type == "Text") return;
        
        result.file = modifier + ".png";
        result.extension = "png";
    }
}

start "A layer asset specification"
    = speclist

speclist "List of layer specifications"
    = first:spec [+,] rest:speclist {
        rest.unshift(first); 
        return rest; 
    }
    / only:spec {
        return [only];
    }

spec "Layer specification"
    = _ component:def_btn trig:goodchars ":" asset:goodchars _ {
        var result = {
            name: asset,
            type: component,
            trig: trig
        };
        mergeModifier(asset, result);
        return result;
    }
    / _ component:def_comp asset:goodchars _ {
        var result = {
            name: asset,
            type: component
        };
        mergeModifier(asset, result);
        return result;
    }
    / _ asset:chars _ {
        var result = {
            name: asset,
            type: "Image"
        };
        mergeModifier(asset, result);
        return result;
    }

def_comp "A component or button definition prefix, like TX:"
    = def_btn
    / "cl:"i {
        return "Class";
    }
    / "tx:"i {
        return "Text";
    }
    
def_btn "A button component definition prefix, like BT:"
    = "bt:"i {
        return "Button";
    }
    / "sb:"i {
        return "ScaleButton";
    }
    / "sbi:"i {
        return "ScaleButtonIcons";
    }
    
goodchars "A sequence of characters, excluding colons"
    = chars:goodchar+ {
        return chars.join("");
    }

goodchar "A character, excluding colons and other weird things"
    = [^+,:/\0-\x1F\x7f]

chars "A sequence of characters, including colons"
    = chars:char+ {
        return chars.join("");
    }

char "A character, including colons"
    = [^,+]

_ "whitespace"
    = whitespace*

whitespace
    = [ \t\n\r]


