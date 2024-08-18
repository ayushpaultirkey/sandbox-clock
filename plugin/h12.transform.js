import XRegExp from "xregexp";
import { JSDOM } from "jsdom";

/**
    * H12 transform function
    * @param {string} code The js code containing H12 component
    * @returns {string}
    * @description
    * * Client version: `v2.1.0`
    * * Transform version: `v2.1.0`
    * * Github: https://github.com/ayushpaultirkey/h12
*/
function main(code = "", ignoreCheck = false) {

    // Check if the code is h12 component
    if(!code.includes("@Component") && !ignoreCheck) {
        return code;
    };
    code = code.replace(/@Component/g, "");

    //Get all template element
    //const matchTemplate = code.matchAll(/<>(.*?)<\/>/gs);
    let matchTemplate = XRegExp.matchRecursive(code, "<>", "</>", "gi");
    for(let template of matchTemplate) {

        let templateOriginal = "<>" + template + "</>";

        let matchBracket = XRegExp.matchRecursive(template, "{", "}", "gi");

        let placeholderIndex = 0;
        let placeholderList = [];
        for(const bracket of matchBracket) {

            if(bracket.match(/\s/gm)) {
                template = template.replace(`{${bracket}}`, `{@PLACEHOLDER${placeholderIndex}}`);
                placeholderList.push(bracket);
                placeholderIndex++;
            };

        };

        let dom = new JSDOM(template);
        let pharsed = phrase(dom.window.document.body.children[0]);

        placeholderIndex = 0;
        for(const placeholder of placeholderList) {
            if(pharsed.includes(`{@PLACEHOLDER${placeholderIndex}}_@SCOPE`)) {
                pharsed = pharsed.replace(`{@PLACEHOLDER${placeholderIndex}}_@SCOPE`, placeholder.trim());
            }
            else {
                pharsed = pharsed.replace(`@PLACEHOLDER${placeholderIndex}`, placeholder.trim());
            }
            placeholderIndex++;
        };


        if(pharsed.includes("<>") && pharsed.includes("</>")) {
            code = code.replace(templateOriginal, main(pharsed, true));
        }
        else {
            code = code.replace(templateOriginal, pharsed);
        }

    };

    return code;

}

function phrase(element = document.body) {

    if(!element) {
        return "";
    }

    // Get elements values
    const childNodes = element.childNodes;
    const attributes = element.getAttributeNames();

    const attributeList = [];
    for(const attribute of attributes) {

        const attributeValue = element.getAttribute(attribute);
        if((attribute == "args" && attributeValue == "") || attribute == "ref" || attribute == "scope") {
            continue;
        }

        if(attributeValue.includes("@PLACEHOLDER")) {
            attributeList.push(`"${attribute}": ${attributeValue.replace(/\{|\}/g, "")}`);
        }
        else {
            attributeList.push(`"${attribute}": \`${attributeValue}\``);
        }

    }

    const childList = [];
    for(var i = 0, ilen = childNodes.length; i < ilen; i++) {

        const child = childNodes[i];
        
        if(child.nodeType === 3) {

            const textValue = child.nodeValue;
            const textMatch = textValue.match(/\w+(?:\.\w+)+|\w+|\S+/gm);

            if(textMatch) {

                let text = textValue.replace(/\n|\s\s/g, "");

                let keyMatch = text.match(/\{[^{}\s]*\}/gm);
                if(keyMatch) {

                    let keyPlaceholder = "@SPLIT";
                    let textModified = text;
                    keyMatch.forEach(match => {
                        textModified = textModified.replace(match, keyPlaceholder);
                    });

                    const textParts = textModified.split(keyPlaceholder);

                    for(let j = 0; j < keyMatch.length; j++) {
                        textParts.splice(2 * j + 1, 0, keyMatch[j]);
                    }
                    for(let j = 0; j < textParts.length; j++) {
                        if(textParts[j].length !== 0) {
                            if(textParts[j].includes("@PLACEHOLDER")) {
                                childList.push(textParts[j].replace(/\{|\}/g, ""));
                            }
                            else {
                                childList.push("`" + textParts[j] + "`");
                            }
                        }
                    }

                }
                else {
                    childList.push("`" + text + "`");
                }

            }

        }
        else {
            childList.push(phrase(child));
        }

    }

    const childCode = `[${childList.join(",")}]`;
    const attributeCode = `{${attributeList.join(",")}}`;

    const hasScope = element.hasAttribute("scope");
    const hasReference = element.hasAttribute("ref");
    const isComponent = element.hasAttribute("args");

    const scope = (isComponent && hasScope) ? element.getAttribute("scope") + "_@SCOPE" :  "this";
    const method = isComponent ? "component" : "node";
    const isAsync = isComponent ? "await" : "";

    let tagName = element.tagName.toLowerCase();
    if(isComponent) {
        if(hasReference) {
            tagName = element.getAttribute("ref");
        }
        else {
            tagName = tagName.charAt(0).toUpperCase() + tagName.slice(1);
        }
    }
    else {
        tagName = `"${tagName}"`;
    }

    const code = `${isAsync} ${scope}.${method}(${tagName},${childCode},${attributeCode})`;

    return code.replace(/,\)/g, ")");

}

export default main;