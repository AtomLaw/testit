(function(window) {

var testit = function() {
    /**
     * group class, which will contain tests
     * In addition, it will be used for wrapping some wrong code from falling.
     * @constructor
     * @private
     * @attribute {String} type         type of object ('group' or 'test')
     * @attribute {String} name         name of group
     * @attribute {String} status       indicate results of all test in group ('pass','fail','error')
     * @attribute {String} comment      text specified by user
     * @attribute {Error}  error        contain error object if some of tests throw it
     * @attribute {Number} time         time in ms spend on code in group
     * @attribute {Object} result       counters for tests and groups
     * @attribute {array}  stack        array of tests and groups
     */
    var group = function() {
        this.type = 'group';
        this.name = undefined;
        this.status = undefined;
        this.comment = undefined;
        this.error = undefined;
        this.time = new Date().getTime();
        this.result = {
            tests: {
                passed: 0,
                failed: 0,
                error: 0,
                total: 0
            },
            groups: {
                passed: 0,
                failed: 0,
                error: 0,
                total: 0
            }
        };
        this.stack = [];
    }

    /**
     * test class, which will contain result and some more info about one test
     * @constructor
     * @private
     * @attribute {String} type         type of object ('group' or 'test')
     * @attribute {String} status       indicate results of test ('pass','fail','error')
     * @attribute {String} comment      text specified by user
     * @attribute {String} description  text generated by script
     * @attribute {Error}  error        contain error object if test can throw it without falling
     * @attribute {Number} time         time in ms spend on test
     * @attribute {Array}  argument     all received arguments
     */
    var test = function() {
        this.type = 'test';
        this.status = undefined;
        this.comment = undefined;
        this.description = undefined;
        this.error = undefined;
        this.time = new Date().getTime();
        this.argument = [];
    }

    /**
     * main group
     * @public
     * @type {group}
     */
    var root = new group();
    this.root = root;
    root.name = 'root';

    /**
     * make new instace of group, fill it, add it to previous group.stack, fill some values in previous group
     * @private
     * @chainable
     * @param  {String}   name          name of new group
     * @param  {Function} fun           function witch will be tryed to execute (commonly consist of tests and other groups)
     */
    var _makeGroup = function(name,fun) {
        switch (arguments.length) {
            case 1 : {
                for (i in root.stack) {
                    if (root.stack[i].type !== 'group') continue;
                    if (root.stack[i].name === name) {
                        return Object.create(this,{link:{value:root.stack[i]}});
                    }
                }
            } break;
            case 2 : break;
            default : throw new RangeError("too much arguments");
        }

        /**
         * replace root with link if defined to provide chaining
         * Save root in oldRoot
         */
        var oldRoot = root;
        root = (this.link)? this.link : root;
        /** var for the new instance of group */
        var newgroup;
        /** identify new group */
        var groupAlreadyExist = false;
        /** find group in current-level stack */
        for (i in root.stack) {
            if (root.stack[i].type !== 'group') continue;
            if (root.stack[i].name === name) {
                newgroup = root.stack[i];
                groupAlreadyExist = true;
                break;
            }
        }
        if (!newgroup) newgroup = new group();
        newgroup.name = name;
        /** set to pass as default. it's may be changed in some next lines */
        newgroup.status ='pass';

        /** return root back */
        root = oldRoot;

        /**
         * making a new root, to provide nesting
         * Nested tests and groups will us it, like first one use root.
         */
        var oldRoot = root;
        root = newgroup;
        /**
         * try to execute code with tests and other groups in it
         * This part provide nesting.
         */
        try{
            fun();
        } catch(e) {
            newgroup.status = 'error';
            /**
             * more understandable error object
             * @type {Object}
             * @property {Error} error      consist basic error object
             * @property {String} type      type of error
             * @property {String} message   message from basic property
             * @property {String} stack     some kind of result of trace()
             */
            var errorObject = {};
            errorObject.error = e;
            errorObject.type = _typeof(e);
            errorObject.message = e.message;
            errorObject.stack = getTrace(e);

            newgroup.error = errorObject;
        }
        /** 
         * reverse inheritance of status
         * If some of deep nested test will 'fail', root will be 'fail' too.
         * More info in updateStatus() comments.
         */
        oldRoot.status = updateStatus(oldRoot.status,root.status);
        /**
         * take back old root
         * Next code do not need nesting.
         */
        root = oldRoot;

        /** update counters */
        switch (newgroup.status) {
            case 'pass' : {
                root.result.groups.passed++;
            } break;
            case 'fail' : {
                root.result.groups.failed++;
            } break;
            case 'error' : {
                root.result.groups.error++;
            } break;
        }
        root.result.groups.total++;

        /** update time */
        newgroup.time = new Date().getTime() - newgroup.time;

        /** finally place this group into previous level stack (if it's a new group) */
        if (!groupAlreadyExist) root.stack.push(newgroup);

        /** return testit with link to this group to provide chaining */
        return Object.create(this,{link:{value:newgroup}});
    }
    /**
     * public interface for _makeGroup
     * @public
     * @example
     *  test.group('name of group',function(){
     *      test.it('nested test');
     *      test.group('nested group',function(){
     *          test.it('deep nested test');
     *      });
     *  });
     */
    this.group = _makeGroup;

    /**
     * basic test. Make new instance of test, fill it, add it to previous group.stack, fill some values in previous group
     * @private
     * @chainable
     * @param  {Multiple} a @required       first argument, which will check for truth it only transmitted
     * @param  {Multiple} b                 second argument which will compared with a if transmitted 
     * @return {Boolean}                    true if 'pass', fail otherwise
     */
    var _it = function(a,b) {
        /**
         * making a new instance of test
         * Most of code in this function will manipulate whis it.
         */
        var newtest = new test();

        /**
         * fill newtest.argument with arguments
         * (arguments is array-like object, but not array. So i can't just  newtest.argument = newtest.argument.concat(arguments); or newtest.argument = arguments)
         */
        for (i in arguments) {
            newtest.argument.push(arguments[i]);
        }

        /** try to figure out what kind of test expected */
        switch (arguments.length) {
            /** in case of no arguments - throw Reference error */
            case 0 : {
                newtest.status = 'error';
                newtest.error = new ReferenceError("at least one argument expected");
            } break;
            /** if there only one argument - test it for truth */
            case 1 : {
                
                if (a) {
                    newtest.description = 'argument exist and not false';
                    newtest.status = 'pass';
                } else {
                    newtest.description = (typeof(a)==='undefined')?'argument is not defined':'argument is not true';
                    newtest.status = 'fail';
                }
            } break;
            /** if there are two arguments - test equalence between them */
            case 2 : {
                
                
                if (_typeof(a) !== _typeof(b)) {
                    newtest.status = 'fail';
                    newtest.description = 'arguments has different types';
                } else {
                    /*switch (_typeof(a)) {
                        case 'array' : {} break;
                        case 'object' : {} break;
                        case 'regexp' : {} break;
                        case 'dom' : {} break;
                        case 'nodelist' : {} break;
                        default : {
                            newtest.status = (a===b);
                        }
                    }*/
                    var equality = (deepCompare(a,b))? true:false;
                    newtest.description = (equality)?'arguments are equal':'arguments are not equal';
                    newtest.status = (equality)? 'pass' : 'fail';
                }
                
            } break;
            /** otherwise throw Range error */
            default : {
                newtest.status = 'error';
                newtest.error = new RangeError("too much arguments");
            }
        }
        
        /** update counters of contained object */
        switch (newtest.status) {
            case 'pass' : {
                root.result.tests.passed++;
            } break;
            case 'fail' : {
                root.result.tests.failed++;
            } break;
            case 'error' : {
                root.result.tests.error++;
            } break;
        }
        root.result.tests.total++;

        /** reverse inheritance of status */
        root.status = updateStatus(root.status,newtest.status);

        /** update time */
        newtest.time = new Date().getTime() - newtest.time;

        /** finally place this test into container stack */
        root.stack.push(newtest);

        /** return testit with link to this test to provide chaining */
        return Object.create(this,{link:{value:newtest}});
    }
    /**
     * public interface for _it()
     * @public
     * @example
     *   test.it(someThing);
     *   test.it(myFunction());
     *   test.it(myVar>5);
     *   test.it(myVar,mySecondVar);
     */
    this.it = _it;

    /**
     * add comment for the linked test or group
     * @private
     * @chainable
     * @type {Function}
     * @param  {String} text        user defined text, which will be used as a comment
     */
    var _comment = function(text) {
        /** add comment, if there are something can be commented */
        if (!this.link) throw new ReferenceError('comment can only be used in testit chain');
        this.link.comment = text;

        return this;
    }
    /**
     * public interface for _comment()
     * @public
     * @example
     *   test.group('group name',function(){
     *      test
     *          .it(someThing)
     *          .comment('comment to test');
     *   }).comment('comment to group');
     */
    this.comment = _comment;

    /**
     * try to execute functions in arguments, depend on test|group result
     * @private
     * @chainable
     * @param  {Function} pass  function to execute if test|group passed
     * @param  {Function} fail  function to execute if test|group failed
     * @param  {Function} error function to execute if test|group cause error
     */
    var _callback = function(pass,fail,error) {
        if (!this.link) throw new ReferenceError('callback can only be used in testit chain');
        if (this.link.status === 'pass' && _typeof(pass) === 'Function' ) try {pass();} catch(e) {throw e;}
        if (this.link.status === 'fail' && _typeof(fail) === 'Function' ) try {fail();} catch(e) {throw e;}
        if (this.link.status === 'error' && _typeof(error) === 'Function' ) try {error();} catch(e) {throw e;}

        return this;
    }
    /**
     * public interface for _callback()
     * @public
     * @example
     *   test.it(someThing).callback(
     *       function() {...} // - will be execute if test passed
     *      ,function() {...} // - will be execute if test failed
     *      ,function() {...} // - will be execute if test error
     *   );
     */
    this.callback = _callback;

    /**
     * Final chain-link: will return result of test or group
     * @private
     * @return {boolean}            true - if test or group passed, false - otherwise.
     */
    var _result = function() {
        if (this.link) {
            return (this.link.status == 'pass')? true : false;
        }
        return undefined;
    }
    /**
     * public interface for _result()
     * @public
     * @example
     *   var testResult = test.it(undefined).comment('comment to test').result(); // testResult === false
     */
    this.result = _result;

    /**
     * Final chain-link: will return arguments of test (not of group!)
     * @private
     * @return                      single argument or array of arguments
     */
    var _arguments = function() {
        if (this.link) {
            if (this.link.type!=='test') return TypeError('groups does not return arguments');
            return (this.link.argument.length===1)? this.link.argument[0] : this.link.argument;
        }
        return undefined;
    }
    /**
     * public interface for _arguments()
     * @public
     * @example
     *   var testArguments = test.it('single').comment('comment to test').arguments(); // testArguments === 'single'
     *   testArguments = test.it('first','second').comment('comment to test').arguments(); // testArguments === ['first','second']
     */
    this.arguments = _arguments;


    /** 
     * apply last stuff and display results
     * type {Function}
     * @private
     */
    var _done = function(obj) {
        /** update time in root */
        root.time = new Date().getTime() - root.time;

        /** display root */
        // console.dir(root);
        _printConsole(root);
    }
    /**
     * public interface for _done()
     * @type {Function}
     * @public
     * @example
     *   test.it(1);
     *   test.it(2);
     *   test.it(3);
     *   
     *   test.done();
     */
    this.done = _done;

    /**
     * pritty display group or test in browser dev console
     * @private
     * @param  {Object} obj     group or test to display
     */
    var _printConsole = function(obj) {

        /** colors for console.log %c */
        var green = "color: green",
            red = "color: red;",
            orange = "color: orange",
            blue = "color: blue",
            normal = "color: normal; font-weight:normal;";

        /** Try to figure out what type of object display and open group */
        switch (obj.type) {
            case 'group' : {
                /** some difference depends on status */
                switch (obj.status) {
                    /** if object passed - make collapsed group*/
                    case 'pass' : {
                        console.groupCollapsed("%s - %c%s%c - %c%d%c/%c%d%c/%c%d%c (%c%d%c ms) %s"
                                     ,obj.name,green,obj.status,normal
                                     ,green,(obj.result.tests.passed+obj.result.groups.passed),normal
                                     ,red,(obj.result.tests.failed+obj.result.groups.failed),normal
                                     ,orange,(obj.result.tests.error+obj.result.groups.error),normal
                                     ,blue,obj.time,normal,((obj.comment)?obj.comment:''));
                    } break;
                    case 'fail' : {
                        console.group("%s - %c%s%c - %c%d%c/%c%d%c/%c%d%c (%c%d%c ms) %s"
                                     ,obj.name,red,obj.status,normal
                                     ,green,(obj.result.tests.passed+obj.result.groups.passed),normal
                                     ,red,(obj.result.tests.failed+obj.result.groups.failed),normal
                                     ,orange,(obj.result.tests.error+obj.result.groups.error),normal
                                     ,blue,obj.time,normal,((obj.comment)?obj.comment:''));
                    } break;
                    case 'error' : {
                        console.group("%s - %c%s%c - %c%d%c/%c%d%c/%c%d%c (%c%d%c ms) %s"
                                     ,obj.name,orange,obj.status,normal
                                     ,green,(obj.result.tests.passed+obj.result.groups.passed),normal
                                     ,red,(obj.result.tests.failed+obj.result.groups.failed),normal
                                     ,orange,(obj.result.tests.error+obj.result.groups.error),normal
                                     ,blue,obj.time,normal,((obj.comment)?obj.comment:''));
                    } break;
                    /** if status is not defined - display error; finish displaying */
                    default : {
                        console.error("No status in object %s",obj.name);
                        return false;
                    }
                }

                /** display description if defined */
                if (obj.description) {
                    console.log(obj.description);
                }
                
                /**
                 * display all tests and groups in stack
                 * It will make new levels of group, if there are groups in stack.
                 */
                for (i in obj.stack) {
                    _printConsole(obj.stack[i]);
                }

                /** display error if defined */
                if (obj.error) {
                    // console.error(obj.error);
                    console.group('%c%s%c: %s',orange,obj.error.type,normal,obj.error.message);
                        console.log(obj.error.stack);
                        console.dir(obj.error.error);
                    console.groupEnd();
                }

                /** close opened group (current level) */
                console.groupEnd();

            } break;
            case 'test' : {
                /** display different results, depend on status */
                switch (obj.status) {
                    case 'pass' : {
                        /** if pass - collaps group*/
                        console.groupCollapsed("%cpass%c: %s",green,normal,(obj.comment)?obj.comment:'');
                    } break;
                    case 'fail' : {
                        console.group("%cfail%c: %s",red,normal,(obj.comment)?obj.comment:'');
                    } break;
                    case 'error' : {
                        console.group("%cerror%c: %s",orange,normal,(obj.comment)?obj.comment:'');
                    } break;
                }
                if (obj.description) console.log(obj.description);
                if (obj.error) console.error(obj.error);
                console.log(obj.argument);
                console.groupEnd();
            } break;
        }
    }
    /**
     * public interface for _printConsole
     * @type {Function}
     * @public
     * @example
     *   test.ptint(test.root);
     */
    this.print = _printConsole;

    /**
     * determinate type of argument
     * More powerfull then typeof().
     * @private
     * @return {String}     type name of argument
     *                      undefined, if type was not determinated
     */
    var _typeof = function (argument) {
        var type;
        try {
            switch (argument.constructor) {
                case Array : type='Array';break;
                case Boolean : type='Boolean';break;
                case Date : type='Date';break;
                case Error : type='Error';break;
                case EvalError : type='EvalError';break;
                case Function : type='Function';break;
                // case Math : type='math';break;
                case Number : {type=(isNaN(argument))?'NaN':'Number';}break;
                case Object : type='Object';break;
                case RangeError : type='RangeError';break;
                case ReferenceError : type='ReferenceError';break;
                case RegExp : type='RegExp';break;
                case String : type='String';break;
                case SyntaxError : type='SyntaxError';break;
                case TypeError : type='TypeError';break;
                case URIError : type='URIError';break;
                case Window : type='Window';break;
                case HTMLDocument : type='HTML';break;
                case NodeList : type='NodeList';break;
                default : {
                    if (typeof argument === 'object'
                     && argument.toString().indexOf('HTML') !== -1) {
                        type = 'HTML';
                    } else {
                        type = undefined;
                    }
                }
            }
        } catch (e) {
            type = (argument === null)? 'null' : typeof argument;
        }
        return type;
    }
    /**
     * public interface for _typeof
     * @public
     * @example
     *   test.typeof(myVar);
     */
    this.typeof = _typeof;

    /**
     * public interface for getTrace(error)
     * @public
     * @example
     *   test.trace();
     */
    this.trace = getTrace;


    this.test = function(){
        console.log(this.link)
    }
}

/**
 * figure out what status will be used
 * Depends on significanse:
 * More significant -> less significant.
 * error -> fail -> pass -> undefined
 * @param  {String} oldstatus   first compared status
 * @param  {String} newstatus   second compared status
 * @return {String}             status which will be set
 */
var updateStatus = function(oldstatus,newstatus) {
    if (oldstatus===undefined) return newstatus;
    if (newstatus===undefined) return oldstatus;
    if (oldstatus==='error' || newstatus==='error') return 'error';
    if (oldstatus==='fail' || newstatus==='fail') return 'fail';
    return 'pass';
}

/**
 * returns a list of functions that have been performed to call the current line
 * @param  {Error} error    if setted, trace will be based on it stack
 * @return {String}         list of functions joined by "\n";
 */
var getTrace = function(error) {
    if (!error) error = new Error();
    var stack = '';
    error.stack.split(/[\n]/).forEach(function(i,n){
        var addToStack = true;
        /** take off empty strings (FireBug) */
        if (i==='') addToStack = false;
        /** take off Errors (Chrome) */
        if (i.indexOf(test.typeof(error))!==-1) addToStack = false;
        /** take of reference to this function */
        if (i.indexOf('getTrace')!==-1) addToStack = false;
        /** take off any references to testit methods */
        for (prop in test) {    
            if (i.indexOf('[as '+prop+']')!==-1) addToStack = false;
        }
        /** fill the stack */
        if (addToStack) {
            stack += (stack)?'\n':'';
            stack += i.replace(/((\s+at\s+)|(^@))/,'');
        }
    })
    return stack;
}

/**
 * Compare any type of variables
 * @return {Boolean}            result of comparison
 * {@link http://stackoverflow.com/a/1144249/1771942}
 */
function deepCompare(){function c(d,e){var f;if(isNaN(d)&&isNaN(e)&&"number"==typeof d&&"number"==typeof e)return!0;if(d===e)return!0;if("function"==typeof d&&"function"==typeof e||d instanceof Date&&e instanceof Date||d instanceof RegExp&&e instanceof RegExp||d instanceof String&&e instanceof String||d instanceof Number&&e instanceof Number)return d.toString()===e.toString();if(!(d instanceof Object&&e instanceof Object))return!1;if(d.isPrototypeOf(e)||e.isPrototypeOf(d))return!1;if(d.constructor!==e.constructor)return!1;if(d.prototype!==e.prototype)return!1;if(a.indexOf(d)>-1||b.indexOf(e)>-1)return!1;for(f in e){if(e.hasOwnProperty(f)!==d.hasOwnProperty(f))return!1;if(typeof e[f]!=typeof d[f])return!1}for(f in d){if(e.hasOwnProperty(f)!==d.hasOwnProperty(f))return!1;if(typeof e[f]!=typeof d[f])return!1;switch(typeof d[f]){case"object":case"function":if(a.push(d),b.push(e),!c(d[f],e[f]))return!1;a.pop(),b.pop();break;default:if(d[f]!==e[f])return!1}}return!0}var a,b;if(arguments.length<1)return!0;for(var d=1,e=arguments.length;e>d;d++)if(a=[],b=[],!c(arguments[0],arguments[d]))return!1;return!0}

/** 
 * make new instance of testit
 * Make it availible from outside.
 */
window.test = new testit();

})(window)