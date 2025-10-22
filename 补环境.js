global.__dirname = undefined;
global.__filename = undefined;

// this = globalThis;
globalThis.self = globalThis;


const createProxyObject = function (objName, baseObj) {
    const proxy = new Proxy(baseObj, {
        get(target, prop, receiver) {
            let value;
            try {
                value = Reflect.get(target, prop, receiver);
                console.log(`[Proxy][get] ${objName}.${String(prop)} ->`, value);
            } catch (err) {
                console.error(`[Proxy][get][error] ${objName}.${String(prop)}:`, err);
                value = undefined;
            }
            // 如果是函数，返回一个新的 Proxy 拦截 apply
            if (typeof value === 'function') {
                let val;
                return new Proxy(value, {
                    apply(funcTarget, thisArg, args) {
                        val = Reflect.apply(funcTarget, thisArg, args);
                        console.log(`[Proxy][apply] ${objName}.${String(prop)} called with`, args, val);
                        return val;
                    }
                });
            }
            return value;
        },
        set(target, prop, value, receiver) {
            console.log(`[Proxy][set] ${objName}.${String(prop)} =`, value);
            try {
                return Reflect.set(target, prop, value, receiver);
            } catch (err) {
                console.error(`[Proxy][set][error] ${objName}.${String(prop)}:`, err);
                return false;
            }
        },
        has(target, prop) {
            console.log(`[Proxy][has] ${objName}.${String(prop)}`);
            return Reflect.has(target, prop);
        },
    });

    // 自动保存到 catvm.memory.htmlelements
    // catvm.memory = catvm.memory || {};
    // catvm.memory.htmlelements = catvm.memory.htmlelements || {};
    // catvm.memory.htmlelements[objName] = proxy;

    // 导出到全局
    globalThis[objName] = proxy;
    return proxy;
};




// 框架内存管理，用于解决变量名重复问题
// 调试日志 window.catvm 把框架功能集中管理，

const catvm = {};
// 框架运行内存
catvm.memory = {
    config: {print: true, proxy: true}, // 框架配置：是否打印，是否使用proxy
    htmlelements:{}, // 所有的html节点元素存放位置
    listeners:{}, // 所有事件存放位置
    log:[], // 环境调用日志统一存放点
    storage:{} // localStorage 全局存放点
}; // 默认关闭打印



// 主要用来保护伪造的函数，使其更难被识别

// 主要用来保护伪造的函数，让其更难识破
;
(() => {
    'use strict';
    // 取原型链上的toString
    const $toString = Function.toString;
    // 取方法名 reload
    const myFunction_toString_symbol = Symbol('('.concat('', ')_', (Math.random() + '').toString(36)));
    const myToString = function () {
        return typeof this == 'function' && this[myFunction_toString_symbol] || $toString.call(this);
    };

    function set_native(func, key, value) {
        Object.defineProperty(func, key, {
            "enumerable": false,  // 不可枚举
            "configurable": true, // 可配置
            "writable": true, // 可写
            "value": value
        })
    }

    delete Function.prototype['toString'];// 删除原型链上的toString
    set_native(Function.prototype, "toString", myToString); // 自定义一个getter方法，其实就是一个hook
    //套个娃，保护一下我们定义的toString，避免js对toString再次toString，如：location.reload.toString.toString() 否则就暴露了
    set_native(Function.prototype.toString, myFunction_toString_symbol, "function toString() { [native code] }");
    catvm.safefunction = (func) => {
        set_native(func, myFunction_toString_symbol, `function ${myFunction_toString_symbol,func.name || ''}() { [native code] }`);
    }; //导出函数到globalThis，更改原型上的toSting为自己的toString。这个方法相当于过掉func的toString检测点
})();

// 日志调试功能
catvm.print = {};
catvm.memory.print = []; // 缓存
catvm.print.log = function () {
    if (catvm.memory.config.print) {
        console.table(catvm.memory.log);

    }
};

catvm.print.getAll = function () { // 列出所有日志
    if (catvm.memory.config.print) {
        console.table(catvm.memory.log);

    }
};
// 框架代理功能

catvm.proxy = function (obj) {
    // Proxy 可以多层代理，即 a = new proxy(a); a = new proxy(a);第二次代理
    // 后代理的检测不到先代理的
    if (catvm.memory.config.proxy == false) {
        return obj
    }
    return new Proxy(obj, {
        set(target, property, value) {
            console.table([{"类型":"set-->","调用者":target,"调用属性":property,"设置值":value}]);
            catvm.memory.log.push({"类型":"set-->","调用者":target,"调用属性":property,"设置值":value});
            // console.log("set", target, property, value);
            return Reflect.set(...arguments); //这是一种反射语句，这种不会产生死循环问题
        },
        get(target, property, receiver) {
            console.table([{"类型":"get<--","调用者":target,"调用属性":property,"获取值":target[property]}]);
            catvm.memory.log.push({"类型":"get<--","调用者":target,"调用属性":property,"获取值":target[property]});
            // console.log("get", target, property, target[property]);
            return target[property];  // target中访问属性不会再被proxy拦截，所以不会死循环
        }
    });
}

var EventTarget = function EventTarget() { // 构造函数

};
catvm.safefunction(EventTarget);

// 因为EventTarget是构造函数，而我们要的是原型，因此需要先hook EventTarget.prototype，设置下原型的名字，否则它会使用父亲的名字
Object.defineProperties(EventTarget.prototype, {
    [Symbol.toStringTag]: {
        value: "EventTarget",
        configurable: true
    }
})

EventTarget.prototype.addEventListener = function addEventListener(type,callback) {
    debugger; //debugger的意义在于检测到是否检测了该方法
    if(!(type in catvm.memory.listeners)){
        catvm.memory.listeners[type] = [];
    }
    catvm.memory.listeners[type].push(callback);
};
catvm.safefunction(EventTarget.prototype.addEventListener);

EventTarget.prototype.dispatchEvent = function dispatchEvent() {
    debugger;
};
catvm.safefunction(EventTarget.prototype.dispatchEvent);

EventTarget.prototype.removeEventListener = function removeEventListener() {
    debugger;
};
catvm.safefunction(EventTarget.prototype.removeEventListener);

// EventTarget = catvm.proxy(EventTarget);
// EventTarget.prototype = catvm.proxy(EventTarget.prototype);
var WindowProperties = function WindowProperties() { // 构造函数

};
catvm.safefunction(WindowProperties);

Object.defineProperties(WindowProperties.prototype, {
    [Symbol.toStringTag]: {
        value: "WindowProperties",
        configurable: true
    }
})

// 设置原型的父对象
WindowProperties.prototype.__proto__ = EventTarget.prototype;



// window = this;
var window = globalThis;
// debugger;
var Window = function Window() { // 构造函数
    // 容易被检测到的  js可以查看堆栈
    throw new TypeError("Illegal constructor");
};
catvm.safefunction(Window);

Object.defineProperties(Window.prototype, {
    [Symbol.toStringTag]: {
        value: "Window",
        configurable: true
    }
})
Window.prototype.__proto__ = WindowProperties.prototype;
window.__proto__ = Window.prototype;

///////////////////////////// 浏览器代码自动生成部分
Window.prototype.PERSISTENT = 1;
Window.prototype.TEMPORARY = 0;


// v8没有setTimeout，浏览器有，但是浏览器把这个方法放到this下面，伪造v8有这个东西，因此我们需要伪造一下
window.setTimeout = function (x, y) {
    // x可能是方法也可能是文本
    typeof (x) == "function" ? x() : undefined;
    typeof (x) == "string" ? eval(x) : undefined;
    // 正确应该 生成UUID，并且保存到内存
    return 123;
};
catvm.safefunction(window.setTimeout);
// 原型下面可以取这个属性\方法，就直接放原型即可
// 只要是方法就需要catvm.safefunction 进行toSting保护
window.open = function open() {
    debugger;
};
catvm.safefunction(window.open);
// 赋值空对象最好使用这种class chrome{} 形式，而不是 {},因为这样我们可以看名字，并且最好挂上代理
window.chrome = catvm.proxy(class chrome {
});
// 打个debugger，因为我们还不知道js有没有调用该方法，也许只是获取了一下，看有没有该方法呢
// 等它真正调用的时候，我们再补全其参数及返回
window.DeviceOrientationEvent = function DeviceOrientationEvent() {
    debugger;
};
catvm.safefunction(window.DeviceOrientationEvent);
window.DeviceMotionEvent = function DeviceMotionEvent() {
    debugger;
};
catvm.safefunction(window.DeviceMotionEvent);

// window.localStorage = class localStorage {
// };
// window.localStorage.getItem = function getItem() {
//     debugger;
// };
// catvm.safefunction(window.localStorage.getItem);
// window.localStorage.setItem = function setItem() {
//     debugger;
// };
// catvm.safefunction(window.localStorage.setItem);
// window.localStorage = catvm.proxy(window.localStorage)
//////////////////////

// debugger;


var Location = function Location() { // 构造函数
    throw new TypeError("Illegal constructor");
};
catvm.safefunction(Location);

Object.defineProperties(Location.prototype, {
    [Symbol.toStringTag]: {
        value: "Location",
        configurable: true
    }
});
var location = {
    "href": 'https://www.google.com/search?q=toys',
    "origin": "https://www.google.com",
    "protocol": "https:",
    "host": "www.google.com",
    "hostname": "www.google.com",
    "port": "",
    "pathname": "/search",
    "search": "?q=toys",
    "hash": ""
};
location.__proto__ = Location.prototype;

////////// 浏览器代码自动生成部分
// location.href = "https://www.baidu.com";
// location.port = "";
// location.protocol = 'https:';
// location.host = 'www.baidu.com';
////////
/// 
location.replace = function(url) {
    console.log('[Mock] location.replace called', url);
};





var Navigator = function Navigator() { // 构造函数
    throw new TypeError("Illegal constructor");
};
catvm.safefunction(Navigator);

Object.defineProperties(Navigator.prototype, {
    [Symbol.toStringTag]: {
        value: "Navigator",
        configurable: true
    }
});
var navigator = {
    // platform: 'Win32',
    // userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    // maxTouchPoints: 0,
    // onLine: true,
    // mimeTypes: [{
    //     suffixes: "pdf",
    //     type: "application/pdf"
    // }],
    //
    // plugins: [{
    //     "0": {},
    //     "1": {}
    // }]

};
navigator.__proto__ = Navigator.prototype;
////////// 浏览器代码自动生成部分

Navigator.prototype.plugins = [];
Navigator.prototype.languages = ["zh-CN", "zh"];
Navigator.prototype.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
Navigator.prototype.platform = 'Win32';
Navigator.prototype.maxTouchPoints = 0;
Navigator.prototype.onLine = true;
Navigator.prototype.mimeTypes = [
{
    suffixes: "pdf",
    type: "application/pdf"
},
{
    suffixes: "pdf",
    type: "text/pdf"
}
];
Navigator.prototype.plugins = [{
    "0": {},
    "1": {}
}];
//上面是定义原型的属性
// navigator比较特殊，它会把属性继续定义到 静态属性中，所以我们也做一下
for (var _prototype in Navigator.prototype) {
    navigator[_prototype] = Navigator.prototype[_prototype]; // 将原型上的方法复制一遍给实例
    if (typeof (Navigator.prototype[_prototype]) != "function") {
        // 相当于Object.defineProperty的get方法，Proxy的get方法，hook原型上的所有方法属性
        Navigator.prototype.__defineGetter__(_prototype, function () {
            debugger;
            var e = new Error();
            e.name = "TypeError";
            e.message = "Illegal constructor";
            e.stack = "VM988:1 Uncaught TypeError: Illegal invocation \r\n " +
                "at <anonymous>:1:21";
            throw e;
            // throw new TypeError("Illegal constructor");
        });
    }
}
////////
/// 
navigator.sendBeacon = function(url, data) {
    console.log('[Mock] navigator.sendBeacon called', url, data);
    return true;
};





// 从浏览器中知道History是全局的，且原型链只是一层，因此比较好伪造（window有多层所以要伪造多层）
// 浏览器中new会报错，因此我们此处也需要报错
var History = function History() { // 构造函数
    throw new TypeError("Illegal constructor");
};
catvm.safefunction(History);
// 浏览器
Object.defineProperties(History.prototype, {
    [Symbol.toStringTag]: {
        value: "History",
        configurable: true
    }
});

var history = {
    length: 1,
};
history.__proto__ = History.prototype;
////////// 浏览器代码自动生成部分
History.prototype.back = function back() {
    debugger;
};

////////
// 浏览器中history是全局的，因此我们也需要定义一个history




// 从浏览器中知道Screen是全局的，且原型链只是一层，因此比较好伪造（window有多层所以要伪造多层）
// 浏览器中new会报错，因此我们此处也需要报错
var Screen = function Screen() { // 构造函数
    throw new TypeError("Illegal constructor");
};
catvm.safefunction(Screen);
// 浏览器
Object.defineProperties(Screen.prototype, {
    [Symbol.toStringTag]: {
        value: "Screen",
        configurable: true
    }
});
var screen = {};
screen.__proto__ = Screen.prototype;
////////// 浏览器代码自动生成部分
Screen.prototype.width = 1494;
Screen.prototype.height = 934;
Screen.prototype.availWidth = 1494;
Screen.prototype.availHeight = 934;
Screen.prototype.colorDepth = 24;
Screen.prototype.pixelDepth = 24;
////////
// 浏览器中screen是全局的，因此我们也需要定义一个screen




// 从浏览器中知道Storage是全局的，且原型链只是一层，因此比较好伪造（window有多层所以要伪造多层）
// 浏览器中new会报错，因此我们此处也需要报错
var Storage = function Storage() { // 构造函数
    throw new TypeError("Illegal constructor");
};
catvm.safefunction(Storage);
// 浏览器
Object.defineProperties(Storage.prototype, {
    [Symbol.toStringTag]: {
        value: "Storage",
        configurable: true
    }
});
var localStorage = {};
localStorage.__proto__ = Storage.prototype;

////////// 浏览器代码自动生成部分

function get_length() {
    return Object.keys(catvm.memory.storage).length;
}

Storage.prototype.length = get_length();
Storage.prototype.key = function key(index) {
    return Object.keys(catvm.memory.storage)[index];
};
catvm.safefunction(Storage.prototype.key);
Storage.prototype.getItem = function getItem(keyName) {
    var result = catvm.memory.storage[keyName];
    if (result) {
        return result;
    } else {
        return null;
    }
};
catvm.safefunction(Storage.prototype.getItem);

Storage.prototype.setItem = function setItem(keyName, keyValue) {
    catvm.memory.storage[keyName] = keyValue;
};
catvm.safefunction(Storage.prototype.setItem);

Storage.prototype.removeItem = function removeItem(keyName) {
    delete catvm.memory.storage[keyName];
};
catvm.safefunction(Storage.prototype.removeItem);

Storage.prototype.clear = function clear() {
    catvm.memory.storage = {};
};
catvm.safefunction(Storage.prototype.clear);


////////

// 代理一般挂在实例上



// 存储一些值，避免污染全局变量空间
catvm.memory.mimetype = {};

var MimeType = function MimeType() { // 构造函数
    throw new TypeError("Illegal constructor");
};
catvm.safefunction(MimeType);



Object.defineProperties(MimeType.prototype, {
    [Symbol.toStringTag]: {
        value: "MimeType",
        configurable: true
    },
});

////////// 浏览器代码自动生成部分
MimeType.prototype.description = "";
MimeType.prototype.enabledPlugin = null;
MimeType.prototype.suffixes = "";
MimeType.prototype.type = "";

for (var _prototype in MimeType.prototype) {
    if (typeof (MimeType.prototype[_prototype]) != "function") {
        // 相当于Object.defineProperty的get方法，Proxy的get方法，hook原型上的所有方法属性
        MimeType.prototype.__defineGetter__(_prototype, function () {
            throw new TypeError("Illegal constructor");
        });
    }
}

////////
catvm.memory.mimetype.new = function (data,initPlugin) {
    var mimetype = {};
    if (data != undefined) {
        mimetype.description = data.description;
        mimetype.enabledPlugin = initPlugin; // plugin实例
        mimetype.suffixes = data.suffixes;
        mimetype.type = data.type;
    }
    // 先赋完值，在指向原型
    mimetype.__proto__ = MimeType.prototype;
    return mimetype;
};

// 代理一般挂在实例上



// 存储一些值，避免污染全局变量空间
catvm.memory.plugin = {};

var Plugin = function Plugin() { // 构造函数
    throw new TypeError("Illegal constructor");
};
catvm.safefunction(Plugin);


catvm.memory.plugin.iterator = function values() {
    // debugger;
    return {
        next:function () {
            if(this.index_ == undefined){
                this.index_ = 0;
            }
            var tmp = this.self_[this.index_];
            this.index_ += 1;
            return {value:tmp,done:tmp==undefined};
        },
        self_:this
    }
};
catvm.safefunction(catvm.memory.plugin.iterator);

Object.defineProperties(Plugin.prototype, {
    [Symbol.toStringTag]: {
        value: "Plugin",
        configurable: true
    },
    // 原型上多了个这个,里面是个方法
    [Symbol.iterator]: {
        value: catvm.memory.plugin.iterator,
        configurable: true
    }
});

////////// 浏览器代码自动生成部分
Plugin.prototype.name = "";
Plugin.prototype.filename = "";
Plugin.prototype.description = "";
Plugin.prototype.length = 0;
Plugin.prototype.item = function item(index) {
    // debugger;
    return this[index];
};
catvm.safefunction(Plugin.prototype.item);
Plugin.prototype.namedItem = function namedItem(key) {
    // debugger;
    return this[key];
};
catvm.safefunction(Plugin.prototype.namedItem);


for (var _prototype in Plugin.prototype) {
    if (typeof (Plugin.prototype[_prototype]) != "function") {
        // 相当于Object.defineProperty的get方法，Proxy的get方法，hook原型上的所有方法属性
        Plugin.prototype.__defineGetter__(_prototype, function () {
            // this是实例
            throw new TypeError("Illegal constructor");
            // return this[pr];
        });
    }
}
/*
{ name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format',MimeTypes:[{"description": "Portable Document Format","suffixes": "pdf","type": "application/pdf"},{"description": "xxxxx","suffixes": "xxxxpdf","type": "xxxxapplication/pdf"}]}
 */
////////
catvm.memory.plugin.new = function (data) {
    var plugin = {};
    if (data != undefined) {
        plugin.description = data.description;
        plugin.filename = data.filename;
        plugin.name = data.name;
        // MimeType
        if (data.MimeTypes != undefined) {
            for (let index = 0; index < data.MimeTypes.length; index++) {
                var mimetypedata = data.MimeTypes[index];
                var mimetype = catvm.memory.mimetype.new(mimetypedata, plugin);
                plugin[index] = mimetype;
                // mimetype.type浏览器显示的是灰色名称，下面这种添加属性会是亮的，因此我们需要换一种添加方式
                // plugin[mimetype.type] = mimetype;
                Object.defineProperty(plugin, mimetype.type, {
                    value: mimetype,
                    writable: true // 是否可以改变
                });
            }

            plugin.length = data.MimeTypes.length;
        }
    }
    // 先赋完值，在指向原型
    plugin.__proto__ = Plugin.prototype;
    return plugin;
};

// 代理一般挂在实例上



// 存储一些值，避免污染全局变量空间
catvm.memory.PluginArray = {};

var PluginArray = function PluginArray() { // 构造函数
    throw new TypeError("Illegal constructor");
};
catvm.safefunction(PluginArray);


catvm.memory.PluginArray.iterator = function values() {
    // debugger;
    return {
        next:function () {
            if(this.index_ == undefined){
                this.index_ = 0;
            }
            var tmp = this.self_[this.index_];
            this.index_ += 1;
            return {value:tmp,done:tmp==undefined};
        },
        self_:this
    }
};
catvm.safefunction(catvm.memory.plugin.iterator);

Object.defineProperties(PluginArray.prototype, {
    [Symbol.toStringTag]: {
        value: "PluginArray",
        configurable: true
    },
    // 原型上多了个这个,里面是个方法
    [Symbol.iterator]: {
        value: catvm.memory.PluginArray.iterator,
        configurable: true
    }
});
// PluginArray实例, PluginArray这个虽然跟Plugin很像，但是无需被new，浏览器一开始就有该实例 navigator.plugins
catvm.memory.PluginArray._ = {};

////////// ///////////////////浏览器代码自动生成部分
PluginArray.prototype.length = 0;
PluginArray.prototype.item = function item(index) {
    // debugger;
    return this[index];
};
catvm.safefunction(PluginArray.prototype.item);
PluginArray.prototype.namedItem = function namedItem(key) {
    // debugger;
    return this[key];
};
catvm.safefunction(PluginArray.prototype.namedItem);

PluginArray.prototype.refresh = function refresh() {
    debugger;
};
catvm.safefunction(PluginArray.prototype.refresh);

// 适用于 调用原型的属性会抛出异常的对象
for (var _prototype in PluginArray.prototype) {
    if (typeof (PluginArray.prototype[_prototype]) != "function") {
        // 相当于Object.defineProperty的get方法，Proxy的get方法，hook原型上的所有方法属性
        PluginArray.prototype.__defineGetter__(_prototype, function () {
            // this是实例
            throw new TypeError("Illegal constructor");
            // return this[pr];
        });
    }
}
/*
{ name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format',MimeTypes:[{"description": "Portable Document Format","suffixes": "pdf","type": "application/pdf"},{"description": "xxxxx","suffixes": "xxxxpdf","type": "xxxxapplication/pdf"}]}
 */
///////////////////////
catvm.memory.PluginArray.ls = [
        {
            "name": "PDF Viewer",
            "filename": "internal-pdf-viewer",
            "description": "Portable Document Format",
            "MimeTypes": [
                {
                    "description": "Portable Document Format",
                    "suffixes": "pdf",
                    "type": "application/pdf"
                },
                {
                    "description": "Portable Document Format",
                    "suffixes": "pdf",
                    "type": "text/pdf"
                }
            ]
        },
        {
            "name": "Chrome PDF Viewer",
            "filename": "internal-pdf-viewer",
            "description": "Portable Document Format",
            "MimeTypes": [
                {
                    "description": "Portable Document Format",
                    "suffixes": "pdf",
                    "type": "application/pdf"
                },
                {
                    "description": "Portable Document Format",
                    "suffixes": "pdf",
                    "type": "text/pdf"
                }
            ]
        },
        {
            "name": "Chromium PDF Viewer",
            "filename": "internal-pdf-viewer",
            "description": "Portable Document Format",
            "MimeTypes": [
                {
                    "description": "Portable Document Format",
                    "suffixes": "pdf",
                    "type": "application/pdf"
                },
                {
                    "description": "Portable Document Format",
                    "suffixes": "pdf",
                    "type": "text/pdf"
                }
            ]
        },
        {
            "name": "Microsoft Edge PDF Viewer",
            "filename": "internal-pdf-viewer",
            "description": "Portable Document Format",
            "MimeTypes": [
                {
                    "description": "Portable Document Format",
                    "suffixes": "pdf",
                    "type": "application/pdf"
                },
                {
                    "description": "Portable Document Format",
                    "suffixes": "pdf",
                    "type": "text/pdf"
                }
            ]
        },
        {
            "name": "WebKit built-in PDF",
            "filename": "internal-pdf-viewer",
            "description": "Portable Document Format",
            "MimeTypes": [
                {
                    "description": "Portable Document Format",
                    "suffixes": "pdf",
                    "type": "application/pdf"
                },
                {
                    "description": "Portable Document Format",
                    "suffixes": "pdf",
                    "type": "text/pdf"
                }
            ]
        }
    ]


for (let index = 0; index < catvm.memory.PluginArray.ls.length; index++) {
    let tmp_plugin = catvm.memory.plugin.new(catvm.memory.PluginArray.ls[index]);
    catvm.memory.PluginArray._[index] = tmp_plugin;
    // mimetype.type浏览器显示的是灰色名称，下面这种添加属性会是亮的，因此我们需要换一种添加方式
    Object.defineProperty(catvm.memory.PluginArray._, tmp_plugin.name, {
        value: tmp_plugin,
    });
}
catvm.memory.PluginArray._.length = catvm.memory.PluginArray.ls.length;

catvm.memory.PluginArray._.__proto__ = PluginArray.prototype;
// 代理一般挂在实例上
catvm.memory.PluginArray._ = catvm.proxy(catvm.memory.PluginArray._);
// 依赖注入
navigator.plugins = catvm.memory.PluginArray._;

// 存储一些值，避免污染全局变量空间
catvm.memory.MimeTypeArray = {};
// MimeTypeArray实例,MimeTypeArray这个虽然跟MimeType很像，但是无需被new，浏览器一开始就有该实例 navigator.mimeTypes
catvm.memory.MimeTypeArray._ = {};


var MimeTypeArray = function MimeTypeArray() { // 构造函数
    throw new TypeError("Illegal constructor");
};
catvm.safefunction(MimeTypeArray);


catvm.memory.MimeTypeArray.iterator = function values() {
    debugger;
    return {
        next:function () {
            if(this.index_ == undefined){
                this.index_ = 0;
            }
            var tmp = this.self_[this.index_];
            this.index_ += 1;
            return {value:tmp,done:tmp==undefined};
        },
        self_:this
    }
};
catvm.safefunction(catvm.memory.MimeTypeArray.iterator);

Object.defineProperties(MimeTypeArray.prototype, {
    [Symbol.toStringTag]: {
        value: "MimeTypeArray",
        configurable: true
    },
    // 原型上多了个这个,里面是个方法
    [Symbol.iterator]: {
        value: catvm.memory.MimeTypeArray.iterator,
        configurable: true
    }
});

////////// ///////////////////浏览器代码自动生成部分
MimeTypeArray.prototype.length = 0;
MimeTypeArray.prototype.item = function item(index) {
    // debugger;
    return this[index];
};
catvm.safefunction(MimeTypeArray.prototype.item);
MimeTypeArray.prototype.namedItem = function namedItem(key) {
    // debugger;
    return this[key];
};
catvm.safefunction(MimeTypeArray.prototype.namedItem);


// 适用于 调用原型的属性会抛出异常的对象
for (var _prototype in MimeTypeArray.prototype) {
    if (typeof (MimeTypeArray.prototype[_prototype]) != "function") {
        // 相当于Object.defineProperty的get方法，Proxy的get方法，hook原型上的所有方法属性
        MimeTypeArray.prototype.__defineGetter__(_prototype, function () {
            // this是实例
            throw new TypeError("Illegal constructor");
            // return this[pr];
        });
    }
}
///////////////////////
// catvm.memory.MimeTypeArray.ls = []  // 所有MimeType存放点
// 遍历 PluginArray实例里面的所有Plugin实例
catvm.memory.MimeTypeArray.mimetype_count = 0;
catvm.memory.MimeTypeArray.mimetype_types = {}; // 所有MimeType.type存放点
for (let index = 0; index < catvm.memory.PluginArray._.length; index++) {
    let tmp_plugin = catvm.memory.PluginArray._[index];
    // 遍历 Plugin实例里面的所有MimeType实例，增加到 MimeTypeArray中
    for(let m_index=0;m_index<tmp_plugin.length;m_index++){
        let tmp_mimetype = tmp_plugin.item(m_index);
        // catvm.memory.MimeTypeArray.ls.push(tmp_mimetype);
        if(!(tmp_mimetype.type in catvm.memory.MimeTypeArray.mimetype_types)){
            catvm.memory.MimeTypeArray.mimetype_types[tmp_mimetype.type] = 1;
            catvm.memory.MimeTypeArray._[catvm.memory.MimeTypeArray.mimetype_count] = tmp_mimetype;
            catvm.memory.MimeTypeArray.mimetype_count += 1;
            // mimetype.type浏览器显示的是灰色名称，下面这种添加属性会是亮的，因此我们需要换一种添加方式
            Object.defineProperty(catvm.memory.MimeTypeArray._, tmp_mimetype.type, {
                value: tmp_mimetype,
            });
        }
    }
}
catvm.memory.MimeTypeArray._.length = catvm.memory.MimeTypeArray.mimetype_count;

catvm.memory.MimeTypeArray._.__proto__ = MimeTypeArray.prototype;
// 依赖注入
navigator.mimeTypes = catvm.memory.MimeTypeArray._;
// 代理一般挂在实例上
navigator.mimeTypes  = catvm.proxy(navigator.mimeTypes)

var HTMLDivElement = function HTMLDivElement() { // 构造函数
    throw new TypeError("Illegal constructor");
};
catvm.safefunction(HTMLDivElement);

Object.defineProperties(HTMLDivElement.prototype, {
    [Symbol.toStringTag]: {
        value: "HTMLDivElement",
        configurable: true
    }
});

var HTMLIFrameElement = function HTMLIFrameElement() { // 构造函数
    throw new TypeError("Illegal constructor");
};
catvm.safefunction(HTMLDivElement);

Object.defineProperties(HTMLIFrameElement.prototype, {
    [Symbol.toStringTag]: {
        value: "HTMLIFrameElement",
        configurable: true
    }
});
////////// 浏览器代码自动生成部分

////////


const createStyleProxy = function() {
    const style = {};
    return new Proxy(style, {
        get(target, prop) {
            // 返回已有值或者空字符串
            return target[prop] || '';
        },
        set(target, prop, value) {
            target[prop] = value;
            console.log(`[Proxy][set] style.${prop} = ${value}`);
            return true;
        }
    });
}


// 用户创建div
catvm.memory.htmlelements["div"] = function () {
    var div = new (function () {});
    //////////////////////////////////////////
    div.align = "";
    /////////////////////////
    div.__proto__ = HTMLDivElement.prototype;
    return div;
}

catvm.memory.htmlelements["iframe"] = function () {
    var iframe = new (function () {});
    //////////////////////////////////////////
    iframe.tagName = "IFRAME";
    iframe.style = createStyleProxy();
    iframe.contentWindow = null;
    /////////////////////////
    iframe.__proto__ = HTMLIFrameElement.prototype;
    return iframe;
}



// 从浏览器中知道Document是全局的，new Document会返回一个对象
var Document = function Document() { // 构造函数
};
catvm.safefunction(Document);
// 浏览器
Object.defineProperties(Document.prototype, {
    [Symbol.toStringTag]: {
        value: "Document",
        configurable: true
    }
});
var document = {
    cookie: '',
    readyState: 'loading',
    // readyState: 'complete',
    body: {},
};
document.__proto__ = Document.prototype;

////////// 浏览器代码自动生成部分
// document.cookie = '';
document.referrer = location.href || '';
document.getElementById = function getElementById(id) {
    debugger;
    // 用id匹配当前环境内存中已有的Element，没找到则返回null
    console.log(`document.getElementById`, id);
    return null;
};
catvm.safefunction(document.getElementById);


document.body.appendChild = function (child) {
    console.log('[Mock] document.body.appendChild called with:', child);
    // 你可以选择保存到一个虚拟 DOM 树里，比如：
    // this._children = this._children || [];
    // this._children.push(child);
    return child; // 按 DOM 规范返回 child
};

document.body.removeChild = function (child) {
    console.log('[Mock] document.body.removeChild called with:', child);
    // if (this._children) {
    //     const idx = this._children.indexOf(child);
    //     if (idx !== -1) this._children.splice(idx, 1);
    // }
    return child;
};

// 用 Proxy 包裹 document.body
document.body = new Proxy(document.body, {
    get(target, prop, receiver) {
        console.log(`[Proxy][get] document.body.${String(prop)}`);
        return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
        console.log(`[Proxy][set] document.body.${String(prop)} =`, value);
        return Reflect.set(target, prop, value, receiver);
    }
});



document.getElementsByTagName = function getElementsByTagName(tag_name) {
    var map_tag = {'body': ["<body link=\"#0000cc\" mpa-version=\"7.16.14\" mpa-extension-id=\"ibefaeehajgcpooopoegkifhgecigeeg\" style=\"\"></body>"]};
    debugger;
    console.log(`document.getElementsByTagName`, tag_name);
    return map_tag[tag_name]
};
catvm.safefunction(document.getElementsByTagName);


document.addEventListener = function addEventListener(type, listener, options, useCapture) {
    debugger;
    console.log(`document.addEventListener`, type, listener, options, useCapture);
};
catvm.safefunction(document.addEventListener);


document.createElement = function createElement(tagName) {
    console.log(`document.createElement`, tagName);
    tagName = tagName.toLowerCase();
    if (catvm.memory.htmlelements[tagName] == undefined) {
        debugger;
    } else {
        var tagElement = catvm.memory.htmlelements[tagName]();
        return catvm.proxy(tagElement);
    }
};
catvm.safefunction(document.createElement);
////////
// 浏览器中document是全局的，因此我们也需要定义一个document 








// // Hook eval后，生成的SG_SS竟然变长了一倍！！！
// const _eval = global.eval;
// global.eval = function(code) {
//   // console.log(`[Hook] eval: ${code}`);
//   return _eval(code);
// };




// 加上下面的这4个，就报错了，SG_SS生成不出来
// 报错： TypeError: ":TQR:TQR:" is not a function
// 原因是：I.U&&":TQR:TQR:"() 这里的I.U在浏览器中是false，但是在NodeJS里面执行竟然变成了true


document.addEventListener = function(event, handler) {
    console.log(`[Hook] document.addEventListener(${event})`);
    if (event === 'DOMContentLoaded') {
      // document.readyState = 'interactive';
      setTimeout(function() { document.readyState = 'interactive'; }, 50);
      // 模拟立即触发
      // 取消这句才可以正常生成
      // setTimeout(() => handler(), 0);
    }
};

document.removeEventListener = function(event, handler) {
  // 如果你实现了事件存储机制，这里要从存储中删除
  // if (this._listeners && this._listeners[event]) {
  //   this._listeners[event] = this._listeners[event].filter(fn => fn !== handler);
  // }
  console.log(`[Hook] document.removeEventListener(${event})`);
};


window.addEventListener = function(event, handler) {
  console.log(`[Hook] window.addEventListener(${event})`);
  if (event === 'load') {
    // document.readyState = 'complete';
    // 模拟加载完成
    // 取消这句才可以正常生成
    // setTimeout(() => handler(), 0);
  }
};

window.removeEventListener = function(event, handler) {
  // if (event === 'load') {
  //   globalThis.document.removeEventListener('load', handler);
  // }
  console.log(`[Hook] window.removeEventListener(${event})`);
};




// 统一加上代理
window = catvm.proxy(window);
Window = catvm.proxy(Window);
location = catvm.proxy(location);
navigator = catvm.proxy(navigator);
catvm.proxy(History.prototype.back);
history = catvm.proxy(history);
screen = catvm.proxy(screen);
localStorage = catvm.proxy(localStorage);
Storage = catvm.proxy(Storage);
navigator.plugins = catvm.proxy(navigator.plugins);
// navigator.plugins = catvm.proxy(navigator.plugins);
document = catvm.proxy(document);




// 要补上
globalThis.window = window;
globalThis.document = document;
globalThis.history = history;
globalThis.location = location;
globalThis.navigator = navigator;
globalThis.screen = screen;
globalThis.localStorage = localStorage;
globalThis.Storage = Storage;



// nodeTiming 是 nodeJS里面独有的，浏览器没有，看到它读取这个了，有可能是检测
// if (!('nodeTiming' in performance)) {
    Object.defineProperty(performance, 'nodeTiming', {
        get() {
            // 浏览器中没有这个属性 → 返回 undefined
            return undefined;
        }
    });
// }

// 给 timeOrigin 返回模拟值（1位小数）
// 保存原生 timeOrigin
// const realTimeOrigin = performance.timeOrigin;
const realTimeOrigin = performance.timeOrigin - 100; // 提前100ms
Object.defineProperty(performance, 'timeOrigin', {
    get() {
        // 将原生 timeOrigin 四舍五入到 1 位小数
        return Math.round(realTimeOrigin * 10) / 10;
    },
    configurable: true,
    enumerable: true
});

// 保存原生 now
const realNow = performance.now.bind(performance);
Object.defineProperty(performance, 'now', {
    // get() {
    //     // 返回一个包装函数
    //     return function(...args) {
    //         const result = realNow(...args);
    //         // 模拟浏览器精度，保留 3 位小数
    //         return Math.round(result * 1000) / 1000;
    //     }
    // },
    get() {
        const wrapper = function now(...args) {
            const result = realNow(...args);
            return Math.round(result * 1000) / 1000;
        };
        wrapper.__isNativeProtected = true;
        wrapper.__nameForToString = 'now';
        return wrapper;
    },
    configurable: true,
    enumerable: true
});

// globalThis.performance = document = catvm.proxy(performance);
createProxyObject('performance', performance);





globalThis.sessionStorage = (() => {
    const store = new Map();

    return {
        getItem(key) {
            key = String(key);
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(String(key), String(value));
        },
        removeItem(key) {
            store.delete(String(key));
        },
        clear() {
            store.clear();
        },
        key(index) {
            return Array.from(store.keys())[index] || null;
        },
        get length() {
            return store.size;
        },
        // 方便调试
        _dump() {
            return Object.fromEntries(store);
        }
    };
})();


createProxyObject('sessionStorage', sessionStorage);



const originalToString = Function.prototype.toString;
Function.prototype.toString = new Proxy(originalToString, {
    apply(target, thisArg, args) {
        // 判断是我们想保护的函数
        // 监听调用
        console.log(`[toString] called on function: ${thisArg.name}`);
        console.log('[toString] thisArg info:', {
            name: thisArg.name,
            constructor: thisArg.constructor.name,
            isFunction: typeof thisArg
        });
        //  // 获取调用栈
        // const stack = new Error().stack.split('\n').slice(2).join('\n');
        // console.log('[toString] 被调用函数:', thisArg.name || '<anonymous>');
        // console.log('[toString] 调用栈:\n', stack);

        if (thisArg && thisArg.__isNativeProtected) {
            const name = thisArg.__nameForToString || thisArg.name || '';
            console.log(`function ${name}() { [native code] }`);
            return `function ${name}() { [native code] }`;
        }
        // 默认调用原始 toString
        return Reflect.apply(target, thisArg, args);
    }
});

const safeFunction = function(func, name) {
    func.__isNativeProtected = true;
    func.__nameForToString = name || func.name || '<anonymous>';
    return func;
}
// console.log('performance.now.toString: ', performance.now.toString());




// node-compatible stub (no real enforcement, only to avoid runtime errors)
const installTrustedTypesStub = function(target) {
  if (!target) return;
  if (!target.trustedTypes) {
    target.trustedTypes = {
      createPolicy: (name, handlers) => {
        return {
          // 尽可能模拟标准接口：createHTML/createScriptURL/createScript 等
          createHTML: handlers && handlers.createHTML ? handlers.createHTML : (s) => s,
          createScript: handlers && handlers.createScript ? handlers.createScript : (s) => s,
          createScriptURL: handlers && handlers.createScriptURL ? handlers.createScriptURL : (s) => s,
          // 你可以添加更多方法按需扩展
        };
      }
    };
  }
}

// 在纯 Node 全局安装（注意：不推荐污染全局，测试环境可用）
// installTrustedTypesStub(globalThis);
// createProxyObject('trustedTypes', trustedTypes);





///以下为执行的JS代码








