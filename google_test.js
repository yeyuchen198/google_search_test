// this = globalThis;
global.self = globalThis;



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
window = catvm.proxy(window);
Window = catvm.proxy(Window);

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


location = catvm.proxy(location);


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


navigator = catvm.proxy(navigator);


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
catvm.proxy(History.prototype.back);
////////
// 浏览器中history是全局的，因此我们也需要定义一个history

history = catvm.proxy(history);


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

screen = catvm.proxy(screen);


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
localStorage = catvm.proxy(localStorage);
Storage = catvm.proxy(Storage);


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
navigator.plugins = catvm.proxy(navigator.plugins);


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
navigator.plugins = catvm.proxy(navigator.plugins);


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
////////// 浏览器代码自动生成部分

////////



// 用户创建div
catvm.memory.htmlelements["div"] = function () {
    var div = new (function () {});
    //////////////////////////////////////////
    div.align = "";
    /////////////////////////
    div.__proto__ = HTMLDivElement.prototype;
    return div;
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
    body: {},
};
document.__proto__ = Document.prototype;

////////// 浏览器代码自动生成部分
// document.cookie = '';
document.referrer = location.href || '';
document.getElementById = function getElementById(id) {
    debugger;
    // 用id匹配当前环境内存中已有的Element，没找到则返回null
    return null;
};
catvm.safefunction(document.getElementById);


document.body.appendChild = function (child) {
    console.log('[Mock] document.body.appendChild called with:', child);
    // 你可以选择保存到一个虚拟 DOM 树里，比如：
    this._children = this._children || [];
    this._children.push(child);
    return child; // 按 DOM 规范返回 child
};

document.body.removeChild = function (child) {
    console.log('[Mock] document.body.removeChild called with:', child);
    if (this._children) {
        const idx = this._children.indexOf(child);
        if (idx !== -1) this._children.splice(idx, 1);
    }
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
    return map_tag[tag_name]
};
catvm.safefunction(document.getElementsByTagName);


document.addEventListener = function addEventListener(type, listener, options, useCapture) {
    debugger;
};
catvm.safefunction(document.addEventListener);


document.createElement = function createElement(tagName) {
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

document = catvm.proxy(document);






// 要补上
globalThis.window = window;
globalThis.document = document;
globalThis.history = history;
globalThis.location = location;
globalThis.navigator = navigator;
globalThis.screen = screen;











///以下为执行的JS代码





window.google = window.google || {};
window.google.c = window.google.c || {
    cap: 0
};



(function() {
                var sctm = false;
                (function() {
                    sctm && google.tick("load", "pbsst");
                }
                ).call(this);
            }
            )();



(function(){var v=function(F,p,X,L,x,g,V,P,I,w){{I=35;while(I!=49)if(I==41)I=(X+3&7)==1?98:78;else if(I==F)w=L,I=41;else{if(I==78)return w;if(I==98){if(V=(P=U.trustedTypes,x),P&&P.createPolicy){try{V=P.createPolicy(g,{createHTML:m,createScript:m,createScriptURL:m})}catch(y){if(U.console)U.console[L](y.message)}w=V}else w=V;I=78}else I==35?I=14:I==14&&(I=X-p&6?41:F)}}},U=this||self,m=function(F){return v.call(this,63,9,9,F)};(0,eval)(function(F,p){return(p=v(63,9,6,"error",null,"ks"))&&F.eval(p.createScript("1"))===1?function(X){return p.createScript(X)}:function(X){return""+X}}(U)(Array(Math.random()*7824|0).join("\n")+['//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjogMywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiICJdLCJuYW1lcyI6WyJjbG9zdXJlRHluYW1pY0J1dHRvbiJdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEifQ==',
'(function(){/*',
'',
' Copyright Google LLC',
' SPDX-License-Identifier: Apache-2.0',
'*/',
'var UM=function(I,F,p,P,V,U,w,m,L,y,v){for(v=90;v!=70;)if(v==24){for(w in m=p,V.i){for(U=(L=V.i[w],p);U<L.length;U++)++m,Pw(15,P,11,L[U]);delete V.i[V.vD--,w]}v=23}else{if(v==23)return y;if(v==25)v=I;else if(v==84){a:{for(w=[P==typeof globalThis&&globalThis,U,(m=V,P==typeof window&&window),P==typeof self&&self,P==typeof global&&global];m<w.length;++m)if((L=w[m])&&L[p]==Math){y=L;break a}throw Error("Cannot find global object");}v=42}else v==I?v=(F+4&47)<F&&(F-9|53)>=F?72:16:v==16?v=(F>>1&6)>=4&&(F<<1&14)<6?24:23:v==72?(this.Y=this.Y,this.aB=this.aB,v=16):v==42?v=(F|56)==F?25:I:v==55?v=F-6<26&&(F-5&15)>=6?84:42:v==90&&(v=55)}},pG=function(I,F,p,P,V,U,w,m,L,y,v,X,g,x){g=35;{X=69;while({})try{if(g==49)break;else if(g==63)this[this+""]=this,v=Promise.resolve(),g=41;else if(g==66)g=U&&w.G?65:17;else if(g==12)w.G=null,m=w.K.pop(),g=81;else if(g==87)X=69,F$(x,8,P,w),g=39;else if(g==75)g=w.K.length?12:34;else if(g==14)g=I>>2&3?41:63;else if(g==35)g=14;else if(g==65)L=w.G,L(function(){C(65,F,p,p,w)}),g=34;else if(g==39)X=69,g=66;else{if(g==78)return v;g==17?g=75:g==41?g=(I|6)>>3==1?98:78:g==34?(v=y,g=78):g==81?(X=92,y=X$(null,m,V,w),g=39):g==98&&(g=75)}}catch(a){if(X==69)throw a;X==92&&(x=a,g=87)}}},e=function(I,F,p,P,V,U,w,m){{m=31;while(m!=0){if(m==68)return w;if(m==94){if((V=(U=R.trustedTypes,p),U)&&U.createPolicy){try{V=U.createPolicy(P,{createHTML:mU,createScript:mU,createScriptURL:mU})}catch(L){if(R.console)R.console[F](L.message)}w=V}else w=V;m=68}else m==98?(n(F,p,P),P[LG]=2796,m=75):m==22?m=(I|8)==I?98:75:m==31?m=22:m==75&&(m=(I^3)&3?68:94)}}},Ww=function(I,F,p,P,V,U,w,m,L,y,v,X){for(v=68;v!=10;)if(v==5)X=(y=Sh[F.substring(0,3)+"_"])?y(F.substring(3),p,P,V,U,w,m,L):D7(p,F,3),v=56;else{if(v==43)return X;v==56?v=I+3>>4?43:35:v==65?v=(I<<1&15)<7&&I+2>>3>=2?75:37:v==68?v=65:v==37?v=(I|16)==I?5:56:v==75?(this.X=F,v=37):v==35&&(v=43)}},Z7=function(I,F,p,P,V,U,w,m,L,y,v,X){{v=74;while(v!=11)if(v==59)v=(F-9|53)<F&&(F-4|65)>=F?72:68;else if(v==25)U=window.btoa,v=2;else if(v==75)v=m<I.length?41:26;else if(v==2)v=U?80:76;else if(v==26)w+=w<<3,w^=w>>11,L=w+(w<<15)>>>0,V=new Number(L&(y=1<<p,(y|1)-3*(y&1)-2*~(y&1)+2*(y|-2))),V[0]=(L>>>p)%P,X=V,v=68;else{if(v==57)return X;v==23?v=(F|7)>>3==1?84:59:v==46?v=75:v==71?(X=p,v=98):v==44?v=27:v==68?v=F+9>=-40&&((F^16)&16)<2?25:98:v==78?(p=U(P).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=/g,""),v=71):v==72?(m=w=0,v=46):v==52?(p=I[hF],X=p instanceof eh?p:null,v=57):v==84?(X=!!(P=p.K6,-2*~I+~(P|I)+(P&~I)+(P|~I)),v=59):v==40?(m++,v=75):v==80?(P="",V=0,v=44):v==95?(P+=String.fromCharCode.apply(null,I.slice(V,V+8192)),v=64):v==64?(V+=8192,v=27):v==76?(p=void 0,v=71):v==74?v=23:v==41?(w+=I.charCodeAt(m),w+=w<<10,w=(U=w>>6,(w&U)+~U-(~w^U)+(~w&U)),v=40):v==98?v=F<<2&15?57:52:v==27&&(v=V<I.length?95:78)}}},Tj=function(I,F,p,P,V,U){for(U=I;U!=31;)if(U==62)U=F<<1&5?28:33;else{if(U==28)return V;U==33?U=28:U==I?U=52:U==52?U=F-4<<1>=F&&(F-8|15)<F?85:62:U==85&&(P.BD&&P.BD.forEach(p,void 0),U=62)}},kw=function(I,F,p,P,V,U,w,m,L){for(L=63;L!=3;)if(L==85)$w.call(this),p||Bw||(Bw=new JF),this.iq=void 0,this.Tc=this.Ac=false,this.fl=this.qI=this.W=this.cD=this.BD=null,L=43;else if(L==95)m=CG[P](CG.prototype,{prototype:p,console:p,replace:p,splice:p,document:p,parent:p,floor:p,propertyIsEnumerable:p,length:p,stack:p,call:p,pop:p}),L=7;else if(L==86)L=(F+6&8)<8&&F-5>=19?97:24;else if(L==24)L=(F<<1&10)==2?95:7;else{if(L==7)return m;L==34?L=(F<<1&16)<8&&F-9>>4>=3?85:43:L==97?(m=Math.floor(this.L()),L=24):L==6?(m=Z7(U,11,P)&&RD(P,U,28,2)!=V&&(!(w=P.hc,2*(U|p)-(w|U)+(w&~U)-(~w&U))||P.dispatchEvent(u7(50,19,I,16,8,1,V,U)))&&!P.Y,L=86):L==43?L=(F&15)==F?6:86:L==63&&(L=34)}},fG=function(I,F,p,P,V,U,w,m,L,y){for(L=84;L!=10;){if(L==25)return y;L==31?L=(p^31)&I?63:46:L==84?L=31:L==63?L=p-I<10&&p>>1>=0?62:25:L==46?(m=P,m^=m<<13,m^=m>>17,m=(w=m<<I,(m|0)-(m|w)+(m&~w)+F*(~m&w)),(m&=U)||(m=1),y=V^m,L=63):L==62&&(U=V,y=function(){return U<P.length?{done:false,value:P[U++]}:{done:true}},L=25)}},C=function(I,F,p,P,V,U,w,m,L,y,v){{v=49;while(v!=93){if(v==87)return y;if(v==61)v=I+4>>3==3?79:31;else if(v==16)v=I-9>>3==3?81:87;else if(v==81)jh.call(this),this.B=new eh(this),this.p6=this,this.hF=null,v=87;else if(v==46){a:if(typeof P==="string")y=typeof p!=="string"||p.length!=F?-1:P.indexOf(p,0);else{for(V=0;V<P.length;V++)if(V in P&&P[V]===p){y=V;break a}y=-1}v=16}else if(v==79)y=Math.floor(this.oB+(this.L()-this.bq)),v=31;else if(v==39){if(V.K.length){(V.J&&":TQR:TQR:"(),V.v$=p,V).J=true;try{m=V.L(),V.Cl=F,V.bq=m,V.Kl=F,V.Ll=m,w=pG(8,0,true,"~",4,p,V),L=P?0:10,U=V.L()-V.bq,V.oB+=U,V.dl&&V.dl(U-V.N,V.j,V.U,V.Cl),V.U=false,V.N=F,V.j=false,U<L||V.HD--<=F||(U=Math.floor(U),V.Gc.push(U<=254?U:254))}finally{V.J=false}y=w}v=61}else v==31?v=(I^58)>>4?16:46:v==22?v=(I&113)==I?39:61:v==49&&(v=22)}}},aD=function(I,F,p,P,V,U,w,m,L,y,v,X){{X=59;while(X!=48)if(X==44)this.src=p,this.i={},this.vD=0,X=18;else{if(X==4)return v;X==I?(m=gD,U in m?w.setAttribute(y,m[U]):w.removeAttribute(y),X=83):X==36?X=gD?I:7:X==59?X=78:X==64?(U=P.type,X=89):X==83?X=((F^50)&6)<4&&(F|6)>>3>=0?44:18:X==20?(Pw(15,true,10,P),X=60):X==80?X=V===""||V==void 0?36:68:X==91?(delete V.i[U],V.vD--,X=4):X==13?(Array.isArray(V)&&(V=V.join(" ")),y=p+U,X=80):X==68?(w.setAttribute(y,V),X=83):X==60?X=V.i[U].length==p?91:4:X==78?X=(F+3&7)==1?13:83:X==18?X=F-I<<1<F&&(F-3|59)>=F?64:4:X==89?X=U in V.i&&yj(22,P,24,p,V.i[U])?20:4:X==7&&(L={},gD=(L.atomic=false,L.autocomplete="none",L.dropeffect="none",L.haspopup=false,L.live="off",L.multiline=false,L.multiselectable=false,L.orientation="vertical",L.readonly=false,L.relevant="additions text",L.required=false,L.sort="none",L.busy=false,L.disabled=false,L[P]=false,L.invalid="false",L),X=I)}}},nG=function(I,F,p,P,V,U,w,m,L,y,v,X,g){{X=48;while(X!=55)if(X==52)X=(U=P)?45:83;else if(X==5)m=typeof U,w=m!=P?m:U?Array.isArray(U)?"array":m:"null",g=w==p||w==P&&typeof U.length==V,X=54;else if(X==28)g=this.n===0?0:Math.sqrt(this.WD/this.n),X=18;else if(X==12)w=(y=Object.getPrototypeOf(w.prototype))&&y.constructor,X=53;else if(X==83)w=this.constructor,X=44;else if(X==48)X=20;else if(X==84)b7.call(this,V),X=52;else if(X==I)X=(L=dD[m])?89:12;else{if(X==41)return g;X==45?(this.T=U,X=77):X==54?X=(F|72)==F?24:41:X==44?X=72:X==24?(g=P.classList?P.classList:sM(64,"string",41,p,P).match(/\\S+/g)||[],X=41):X==79?(U=L?typeof L.IB==="function"?L.IB():new L:null,X=45):X==20?X=(F&94)==F?28:18:X==93?X=(F-2^19)<F&&(F+6^14)>=F?5:54:X==18?X=(F|1)>>4?77:84:X==59?(v=function(x){return p.call(v.src,v.listener,x)},p=Qj,g=v,X=93):X==77?X=(F-6^21)<F&&(F+6^24)>=F?59:93:X==19?(m=Hw(6,5,w),X=I):X==72?X=w?19:79:X==53?X=72:X==89&&(X=79)}}},RD=function(I,F,p,P,V,U,w,m,L,y){for(L=68;L!=40;)if(L==68)L=61;else{if(L==75)return y;if(L==16)y=!!(V=I.Mh,P*(V|0)-(V|F)+~V-~F),L=75;else if(L==61)L=(p-8^2)<p&&(p-1^28)>=p?10:57;else if(L==57)L=p+5>>5<3&&(p-2&3)>=2?16:75;else if(L==10){a:{for(m=P;m<F.length;++m)if(w=F[m],!w.Da&&w.listener==V&&w.capture==!!I&&w.xn==U){y=m;break a}y=-1}L=57}}},Pw=function(I,F,p,P,V,U,w,m,L,y){{L=18;while(L!=0)if(L==I)P.Da=F,P.listener=null,P.proxy=null,P.src=null,P.xn=null,L=62;else if(L==4)m=V.classList.contains(U),L=76;else if(L==66)L=((p^3)&1)>=0&&(p+6&7)<4?I:62;else if(L==62)L=(p+5&45)>=p&&(p-5^18)<p?61:84;else{if(L==84)return y;L==76?(y=m,L=84):L==18?L=66:L==61?L=V.classList?4:12:L==12&&(w=nG(34,73,P,V),m=C(51,F,U,w)>=0,L=76)}}},KG=function(I,F,p,P,V,U,w,m,L,y,v,X){{X=99;while(X!=96)if(X==82)X=18;else if(X==81)X=18;else if(X==48)v=F&&F.parentNode?F.parentNode.removeChild(F):null,X=52;else if(X==70)X=50;else if(X==89)V=[],m=L=0,X=70;else if(X==7)L+=p,w=(P=w<<p,y=F[m],-2*~P+~y-2*(~P^y)+3*(~P|y)),X=82;else if(X==84)X=(I|4)>>3?52:48;else if(X==57)this[this+""]=this,X=84;else if(X==5)v=V,X=77;else if(X==18)X=L>7?58:6;else if(X==77)X=I-4>=10&&I+1>>5<2?57:84;else if(X==97)X=(I|8)==I?89:77;else if(X==99)X=97;else if(X==6)m++,X=50;else if(X==50)X=m<F.length?7:5;else{if(X==52)return v;X==58&&(L-=8,V.push((U=w>>L,255+(~U^255)-(~U|255))),X=81)}}},u7=function(I,F,p,P,V,U,w,m,L,y){for(L=58;L!=96;)if(L==65)L=(F|4)>=23&&(F+2&8)<1?44:77;else{if(L==18)return y;if(L==62)typeof P.className==p?P.className=V:P.setAttribute&&P.setAttribute("class",V),L=18;else if(L==77)L=(F&125)==F?62:18;else if(L==84)L=F<<2&7?65:I;else if(L==58)L=84;else if(L==44){a:{switch(m){case U:y=w?"disable":"enable";break a;case 2:y=w?"highlight":"unhighlight";break a;case 4:y=w?"activate":"deactivate";break a;case V:y=w?"select":"unselect";break a;case P:y=w?"check":"uncheck";break a;case p:y=w?"focus":"blur";break a;case 64:y=w?"open":"close";break a}throw Error("Invalid component state");}L=77}else L==I&&(this.VX=R.document||document,L=65)}},AF=function(I,F,p,P,V,U){for(V=65;V!=68;)if(V==34)this.type=p,this.currentTarget=this.target=P,this.defaultPrevented=this.yX=false,V=79;else if(V==39)V=25;else if(V==54)V=P?28:I;else if(V==33)V=F+1>>3==1?34:79;else{if(V==22)return U;if(V==28)V=typeof p!=="function"?57:22;else{if(V==I)throw Error("Invalid class name "+P);if(V==57)throw Error("Invalid decorator function "+p);V==65?V=33:V==25?V=(F>>1&5)==1?54:22:V==79&&(V=(F|48)==F?39:25)}}},Q=function(I,F,p,P,V,U,w,m,L,y,v){I+((I|64)==I&&(v=(U=P[F]<<24|P[(F|0)+1]<<16,V=P[~F-3*~(F|2)+(F&-3)+2*(~F^2)]<<p,(V|0)+~(U&V)-~U)|P[(F&3)+~F-2*~(F|3)+(F|-4)]),I-9>>3||(P=CG[F.A](F.xX),P[F.A]=function(){return p},P.concat=function(X){p=X},v=P),8)>>2<I&&I+8>>1>=I&&(m=qA,P=[9,91,2,-7,96,-35,P,73,-25,43],y=V&7,L=CG[F.A](F.Db),L[F.A]=function(X){w=X;while("C")if(false!=(y+=p+7*V,null))break;if(true)y=-1-~y-(y&-8)},L.concat=function(X,g,x,a){return(w=(g=(X=(a=U%16+1,-168*U*U*w+4*U*U*a+42*w*w)+P[y+27&7]*U*a-3822*U*w-630*w+(m()|0)*a-a*w+y,P[X]),void 0),P)[(x=y+29,~(x&7)- -1-2*~x+2*(~x|7))+(V&2)]=g,P[y+(-2*~(V&2)-1+~V+(V&-3))]=91,g},v=L);switch(!((I+8&49)>=I&&(I-7^20)<I)){case true:NaN;break;case false:V=b(P,102);{U=p;while(F>p)U=U<<8|EM(8,P,true),F--}n(V,P,U);break}return v},yj=function(I,F,p,P,V,U,w,m,L,y,v,X,g){{v=10;while(v!=1)if(v==92)v=Array.isArray(U)?42:71;else if(v==71)L=zj(L,6),V&&V[i7]?V.B.add(String(U),L,P,zj(null,5,m)?!!m.capture:!!m,w):NA(null,w,48,U,P,false,m,V,L),v=93;else if(v==79)v=(p|24)==p?18:59;else if(v==59)v=(p|9)>=23&&(p^63)<28?92:93;else if(v==30)v=y<U.length?63:93;else if(v==53)X=function(){},w=void 0,V=Yw(P,function(x,a){for(a=91;a!=23;)a==91?a=X?81:23:a==81&&(F&&oD(F),w=x,X(),X=void 0,a=23)},!!F),m=V[0],U=V[1],g={top:function(x,a,f,A,c,Z,B){for(B=87;B!=I;)if(B==27)B=a?80:29;else if(B==31)A=X,X=function(){(A(),oD)(Z)},B=I;else{if(B==29)return c=m(f),x&&x(c),c;B==87?(Z=function(){w(function(d){oD(function(){x(d)})},f)},B=27):B==50?(Z(),B=I):B==80&&(B=w?50:31)}},pe:function(x){U&&U(x)}},v=46;else{if(v==46)return g;v==42?(y=F,v=11):v==10?v=49:v==11?v=30:v==93?v=p-4>>3?46:53:v==18?(U=C(53,1,F,V),(w=U>=P)&&Array.prototype.splice.call(V,U,1),g=w,v=59):v==74?(y++,v=30):v==49?v=(p-1&11)==1?32:79:v==63?(yj(22,0,36,true,V,U[y],w,m,L),v=74):v==32&&(P.classList?Array.prototype.forEach.call(F,function(x){S("string",3,"class",1," ",x,P)}):u7(50,5,"string",P,Array.prototype.filter.call(nG(34,79,"class",P),function(x){return!(C(50,1,x,F)>=0)}).join(" ")),v=79)}}},NA=function(I,F,p,P,V,U,w,m,L,y,v,X,g,x,a){for(a=26;a!=21;)if(a==54)a=m.addListener&&m.removeListener?60:82;else if(a==47)a=(p&25)==p?16:56;else if(a==38)a=L<m.length?33:56;else{if(a==82)throw Error("addEventListener and attachEvent are unavailable.");if(a==72)yj(22,0,37,U,w,m,P,F,V),a=56;else if(a==0){if(w=U.B.i[String(P)]){for(X=(w=w.concat(),m=0,I);m<w.length;++m)(v=w[m])&&!v.Da&&v.capture==V&&(y=v.xn||v.src,L=v.listener,v.zc&&aD(9,12,0,v,U.B),X=L.call(y,F)!==false&&X);x=X&&!F.defaultPrevented}else x=I;a=23}else if(a==12)m.attachEvent(S("on",9,P.toString()),v),a=27;else{if(a==76)return x;if(a==17)X=zj(I,13,w)?!!w.capture:!!w,(g=Z7(m,32))||(m[hF]=g=new eh(m)),y=g.add(P,L,V,X,F),a=50;else if(a==29)V=zj(V,10),w&&w[i7]?w.B.add(String(m),V,false,zj(I,37,F)?!!F.capture:!!F,P):NA(null,P,49,m,false,false,F,w,V),a=56;else if(a==68)a=m.attachEvent?12:54;else if(a==19)a=Array.isArray(m)?83:29;else if(a==16)a=F&&F.once?72:19;else if(a==71)p_||(w=X),w===void 0&&(w=U),m.addEventListener(P.toString(),v,w),a=27;else{if(a==96)throw Error("Invalid event type");a==50?a=y.proxy?76:1:a==60?(m.addListener(v),a=27):a==56?a=(p&39)==p?0:23:a==27?(Gj++,a=76):a==1?(v=nG(34,34),y.proxy=v,v.src=m,v.listener=y,a=79):a==4?(L++,a=38):a==43?a=38:a==99?a=P?17:96:a==83?(L=0,a=43):a==33?(NA(null,F,9,P,V,true,w,m[L]),a=4):a==26?a=47:a==23?a=(p|48)==p?99:76:a==79&&(a=m.addEventListener?71:68)}}}},Hw=function(I,F,p,P,V,U,w,m,L,y,v){{y=28;while(y!=32)if(y==14)y=(F+5^30)<F&&F-I<<1>=F?0:91;else if(y==I)y=U.vD==p?87:91;else if(y==15)y=(F|64)==F?18:90;else if(y==33)aD(9,5,p,V,m.B),y=91;else if(y==7)aD(9,7,p,V,U),y=I;else if(y==51)Array.prototype.forEach.call(P,function(X,g,x){for(x=15;x!=71;)x==15?x=p.classList?24:41:x==75?(g=sM(64,"string",40,"class",p),u7(50,13,"string",p,g+(g.length>0?" "+X:X)),x=71):x==24?(p.classList.add(X),x=71):x==41&&(x=Pw(15,1,30,"class",p,X)?71:75)}),y=90;else if(y==87)U.src=P,m[hF]=P,y=91;else if(y==82){for(U in V=(Array.prototype.forEach.call(nG(34,77,(w={},"class"),p),function(X){w[X]=true}),Array.prototype.forEach.call(P,function(X){w[X]=true}),""),w)V+=V.length>0?" "+U:U;y=(u7(50,9,"string",p,V),90)}else if(y==70)L=V.type,w=V.proxy,m.removeEventListener?m.removeEventListener(L,w,V.capture):m.detachEvent?m.detachEvent(S("on",20,L),w):m.addListener&&m.removeListener&&m.removeListener(w),Gj--,U=Z7(m,36),y=17;else if(y==90)y=F>>2<20&&(F>>2&7)>=5?60:14;else if(y==84)y=m&&m[i7]?33:70;else if(y==53)y=(F&71)==F?37:15;else if(y==0)y=typeof V!=="number"&&V&&!V.Da?24:91;else if(y==17)y=U?7:10;else if(y==18)y=p.classList?51:82;else if(y==24)m=V.src,y=84;else if(y==37)v=Object.prototype.hasOwnProperty.call(p,F1)&&p[F1]||(p[F1]=++X1),y=15;else{if(y==91)return v;y==60?(P.tF(function(X){U=X},p,V),v=U,y=14):y==28?y=53:y==10&&(Pw(15,true,5,V),y=91)}}},tF=function(I,F,p,P,V,U,w,m){for(w=4;w!=97;){if(w==I)return m;w==2?w=(P&62)==P?36:41:w==36?(this.n++,V=p-this.S,this.S+=V/this.n,this.WD+=V*(p-this.S),w=41):w==41?w=(P^5)>>4>=I&&(P+F&4)<F?24:I:w==24?(MA.call(this,p,V||l7.IB(),U),w=I):w==4&&(w=2)}},S=function(I,F,p,P,V,U,w,m,L){{m=26;while(m!=33)if(m==98)L=p in w8?w8[p]:w8[p]=I+p,m=75;else if(m==63)w.classList?w.classList.remove(U):Pw(15,P,31,p,w,U)&&u7(50,17,I,w,Array.prototype.filter.call(nG(34,75,p,w),function(y){return y!=U}).join(V)),m=16;else if(m==60)P.K.splice(I,I,p),m=22;else if(m==16)m=(F-2^12)<F&&F-5<<1>=F?60:22;else if(m==68)m=(F&61)==F?98:75;else if(m==75)m=(F+7&44)>=F&&F+5>>2<F?63:16;else if(m==26)m=68;else if(m==22)return L}},OM=function(I,F,p,P,V,U,w,m){for(m=22;m!=84;)if(m==44)U=F,m=I;else{if(m==I)return U;m==54?(w=function(){},w.prototype=V.prototype,P.D=V.prototype,P.prototype=new w,P.prototype.constructor=P,P.ja=function(L,y,v){for(var X=27;X!=29;)if(X==27)var g=Array((X=81,arguments.length)-F),x=F;else{if(X==5)return V.prototype[y].apply(L,g);X==81?X=0:X==61?(g[x-F]=arguments[x],X=9):X==9?(x++,X=0):X==0&&(X=x<arguments.length?61:5)}},m=5):m==22?m=14:m==14?m=(p&119)==p?54:5:m==5&&(m=(p|1)>>4?I:44)}},sM=function(I,F,p,P,V,U,w,m,L){{m=22;while(m!=63)if(m==65)m=this.O.length<50?98:29;else if(m==I)m=(p|56)==p?16:2;else if(m==19)m=(p>>1&13)==4?50:33;else{if(m==6)return L;if(m==11)m=(p&31)==p?59:19;else if(m==49)this.n++,m=65;else if(m==16)Vx.call(this,F?F.type:""),this.relatedTarget=this.currentTarget=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=this.offsetY=this.offsetX=0,this.key="",this.charCode=this.keyCode=0,this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=false,this.state=null,this.pointerId=0,this.pointerType="",this.timeStamp=0,this.gl=null,F&&this.init(F,P),m=2;else if(m==33)m=(p-4^27)<p&&(p-2^30)>=p?49:I;else if(m==29)P=Math.floor(Math.random()*this.n),P<50&&(this.O[P]=F),m=I;else if(m==98)this.O.push(F),m=I;else if(m==59){if((U=P.length,U)>F){for(V=(w=Array(U),F);V<U;V++)w[V]=P[V];L=w}else L=[];m=19}else m==2?m=(p-3&13)==1?54:6:m==54?(this.listener=F,this.proxy=null,this.src=w,this.type=U,this.capture=!!V,this.xn=P,this.key=++PX,this.zc=this.Da=false,m=6):m==22?m=11:m==50&&(L=typeof V.className==F?V.className:V.getAttribute&&V.getAttribute(P)||"",m=33)}}},D7=function(I,F,p,P,V,U,w,m,L,y,v,X,g,x){for(x=94;x!=12;)if(x==96)L=w[y],x=97;else if(x==30)x=(p>>1&6)>=0&&((p^52)&8)<4?41:71;else if(x==4)x=27;else{if(x==84)return X;if(x==42)g(L),x=62;else if(x==71)x=(p|16)==p?65:84;else if(x==62)y++,x=27;else if(x==86){a:{if(L&&typeof L.length==V){if(zj(I,21,L)){v=typeof L.item=="function"||typeof L.item=="string";break a}if(typeof L==="function"){v=typeof L.item=="function";break a}}v=false}x=(US(P,5,0,g,v?sM(64,0,5,L):L),62)}else if(x==41)I(function(a){a(F)}),X=[function(){return F},function(){}],x=71;else if(x==94)x=93;else if(x==97)x=!nG(34,19,"array","object",V,L)||zj(I,29,L)&&L.nodeType>0?42:86;else if(x==65)g=function(a){a&&m.appendChild(typeof a==="string"?U.createTextNode(a):a)},y=F,x=4;else if(x==93)x=(p-8|35)<p&&p-6<<2>=p?9:30;else if(x==9){a:{for(U in P)if(V.call(void 0,P[U],U,P)){X=I;break a}X=F}x=30}else x==27&&(x=y<w.length?96:84)}},b=function(I,F,p,P,V,U,w,m,L,y,v){switch(!((F^55)>=18&&F+9<22)){case true:true;break;case NaN===NaN:if(U=md("object","null",P)==="array"?P:[P],this.v)I(this.v);else try{V=!this.K.length&&!this.J,w=[],S(0,15,[L_,w,U],this),S(0,43,[vX,I,w],this),p&&!V||C(16,0,p,true,this)}catch(X){F$(X,8,"~",this),I(this.v)}break}return(F+((F&(((F^((F|80)==F&&(U=EM(8,p,true),(U|0)- -129+~(U|I)&&(U=(V=2*(U|127)- -2+~(U|127)+(~U^127),P=EM(8,p,true)<<7,2*~(V&P)- -1-3*~(V|P)+2*(~V^P))),v=U),36))&23)==2&&(I.C?v=xZ(I.F,I):(V=D(true,8,I),(V|0)- -129+~(V|128)&&(V=-256+2*(V|128)-(V|-129)+(~V|128),P=D(true,2,I),V=(p=V<<2,4*~(p&P)-3*~p-3*~P+2*(~p^P))),v=V)),(F|40)==F&&(I.C?v=xZ(I.F,I):(V=D(true,8,I),(V|0)- -129+~(V|128)&&(V=-256+2*(V|128)-(V|-129)+(~V|128),P=D(true,2,I),V=(p=V<<2,4*~(p&P)-3*~p-3*~P+2*(~p^P))),v=V)),90))==F&&(v=y=function(){for(var X=29;X!=24;)if(X==0)X=U==2?3:4;else if(X==89){var g=X$(null,x,4,V);X=78}else if(X==3)S(0,46,x,V),g=C(17,0,I,I,V),X=78;else if(X==83)m&&L&&m.removeEventListener(L,y,g8),X=24;else if(X==39)var x=[yx,w,P,void 0,(X=0,m),L,arguments];else if(X==48)X=V.g?39:83;else if(X==31){var a=!V.K.length&&!V.J;X=(S(0,11,x,V),a&&C(32,0,I,I,V),78)}else if(X==29)X=V.X==V?48:24;else{if(X==78)return g;X==4&&(X=U==p?31:89)}}),8)^14)>=F&&(F-1|26)<F&&(I.C?v=xZ(I.F,I):(p=D(true,8,I),(p|0)- -129+~(p|128)&&(p=-256+2*(p|128)-(p|-129)+(~p|128),V=D(true,2,I),p=(P=p<<2,4*~(P&V)-3*~P-3*~V+2*(~P^V))),v=p)),v},$Z=function(I,F,p,P,V,U,w,m,L,y,v,X,g,x,a,f){{f=64;while(f!=6)if(f==64)f=72;else{if(f==54)return a;if(f==75){a:{for(g=(y=f_,U.split(P)),v=F;v<g.length-V;v++){if(!(x=g[v],x in y))break a;y=y[x]}(X=(m=y[L=g[g.length-V],L],w)(m),X)!=m&&X!=p&&A1(y,L,{configurable:true,writable:true,value:X})}f=8}else f==52?(this.n===0?a=[0,0]:(this.O.sort(function(A,c){return A-c}),a=[this.n,this.O[this.O.length>>1]]),f=54):f==72?f=I-5>>3?8:59:f==59?f=w?75:8:f==8&&(f=(I+2&26)>=I&&(I+3^19)<I?52:54)}}},zj=function(I,F,p,P,V,U){{V=6;while(V!=45){if(V==37)return U;V==79?V=((F^28)&7)==1?42:60:V==42?(P=typeof p,U=P=="object"&&p!=I||P=="function",V=60):V==6?V=79:V==24?(typeof I==="function"?U=I:(I[J1]||(I[J1]=function(w){return I.handleEvent(w)}),U=I[J1]),V=37):V==60&&(V=F<<2&6?37:24)}}},F$=function(I,F,p,P,V,U,w,m,L,y,v,X,g){{X=65;while(X!=81){if(X==93)return g;if(X==32){if(I.X=((I.H+=(m=(y=(L=(v=(P||I.Kl++,I.m1>p&&I.J&&I.v$&&I.uq<=1&&!I.C&&!I.G&&(!P||I.yq-V>1))&&document.hidden==0,I.Kl==4))||v?I.L():I.Ll,y)-I.Ll,m>>14>p),I.h)&&(I.h^=(I.H+1>>2)*(m<<2)),I).H+1>>2!=p||I.X,L||v)I.Ll=y,I.Kl=p;X=(v?(I.m1>I.Cl&&(I.Cl=I.m1),y-I.bq<I.m1-(U?255:P?5:2)?g=false:(I.yq=V,w=W(P?508:473,I),K(473,I,I.R),I.K.push([aT,w,P?V+1:V,I.j,I.U]),I.G=oD,g=true)):g=false,93)}else X==67?X=F+8&7?1:35:X==35?(P.v=((P.v?P.v+p:"E:")+I.message+":"+I.stack).slice(0,2048),X=1):X==1?X=(F+2&3)==1?32:93:X==65&&(X=67)}}},BX=function(I,F){return sM.call(this,64,I,56,F)},cX=function(I,F,p,P,V){return sM.call(this,64,V,36,p,F,I,P)},W=function(I,F,p){p=F.g[I];switch(!(p===void 0)){case 0==![]:NaN;break;case false:throw[kZ,30,I];break}while(p.value){return p.create();if(0===-0)break}return(p.create(I*4*I+91*I+15),p).prototype},C_=function(I,F,p,P,V){return Hw.call(this,6,72,I,F,p,P,V)},bx=function(I,F,p,P,V,U,w,m){switch(!!p.v){case !null:false;break;case false:p.uq++;try{for(U=(w=0,m=p.R,void 0);--P;)try{if((V=void 0,p).C)U=xZ(p.C,p);else{if((w=Y(473,p),w)>=m)break;V=(K(508,p,w),b(p,31)),U=Y(V,p)}F$(p,3,0,(U&&U[h1]&2048?U(p,P):eG([kZ,21,V],p,469,0),false),P,false)}catch(L){W(I,p)?eG(L,p,469,F):K(I,p,L)}while(!P){while(p.IA){bx(229,22,(p.uq--,p),822957477519);return;if(false==0)break}if(eG([kZ,33],p,469,0),true)break}}catch(L){try{eG(L,p,469,F)}catch(y){F$(y,16,"~",p)}}p.uq--;break}},US=function(I,F,p,P,V,U,w,m,L,y,v,X,g,x){for(x=73;x!=70;)if(x==13)v=zj(p,5,V)?!!V.capture:!!V,U=zj(U,8),x=69;else{if(x==42)return g;x==24?x=m?92:16:x==94?(w in U&&P.call(void 0,U[w],w,V),x=19):x==75?((y=L.ey(v,U,w,P))&&Hw(6,13,0,null,y),x=16):x==81?x=Array.isArray(w)?72:13:x==39?x=99:x==72?(X=I,x=89):x==21?x=(F-2^5)<F&&F-2<<2>=F?81:16:x==76?(X++,x=55):x==33?(U=new BX(p,this),P=I.xn||I.src,w=I.listener,I.zc&&Hw(6,14,0,null,I),V=w.call(P,U),x=26):x==40?x=L?75:16:x==69?x=m&&m[i7]?87:24:x==99?x=w<m?94:42:x==52?(m=V.length,U=typeof V==="string"?V.split(I):V,w=p,x=39):x==15?(US(0,38,null,P,V,U,w[X],m),x=76):x==89?x=55:x==55?x=X<w.length?15:16:x==26?(g=V,x=21):x==8?x=I.Da?80:33:x==16?x=(F+5&63)<F&&(F-3^30)>=F?49:97:x==80?(V=true,x=26):x==87?(m.B.remove(String(w),U,v,P),x=16):x==92?(L=Z7(m,40),x=40):x==49?(I.IB=function(){return I.RB?I.RB:I.RB=new I},I.RB=void 0,x=97):x==97?x=(F&31)==F?52:42:x==19?(w++,x=99):x==73?x=22:x==22&&(x=(F&59)==F?8:21)}},mU=function(I){return OM.call(this,7,I,8)},n_=function(I,F,p){{p=16;while(p!=78)if(p==47)p=63;else{if(p==3)return F;p==22?p=63:p==63?p=I--?76:3:p==16?(F=[],p=22):p==76&&(F.push(Math.random()*255|0),p=47)}}},ux=function(I,F,p,P,V,U,w,m,L,y){for(U=(w=((L=b(P,(y=P[RT]||{},I)),y.L6=b(P,47),y).Z=[],P).X==P?(EM(8,P,p)|0)-V:1,m=b(P,70),0);U<w;U++)y.Z.push(b(P,F));for(y.MI=T(m,P);w--;)y.Z[w]=Y(y.Z[w],P);return y.gm=Y(L,P),y},Z5=function(I){return KG.call(this,3,I)},t,Nk=function(){return Ww.call(this,3)},$w=function(){return C.call(this,34)},A1=typeof Object.defineProperties=="function"?Object.defineProperty:function(I,F,p,P){{P=27;while(P!=63)if(P==27)P=I==Array.prototype||I==Object.prototype?34:99;else{if(P==34)return I;if(P==99)return I[F]=p.value,I}}},X$=function(I,F,p,P,V,U,w,m,L,y,v,X){X=F[0];switch(!(X==L_)){case true:switch(!(X==vX)){case Number()===-0:switch(!(X==aT)){case true:if(X==WX)P.j=true,P.l(F);else switch(!(X==K_)){case false==![]:for(undefined;X==yx;Number(undefined)){return L=F[2],n(437,P,F[6]),n(504,P,L),P.l(F);if(true)break}X==h1?(P.l(F),P.qh=[],P.Gc=[],P.g=I):X==LG&&R.document.readyState==="loading"&&(P.G=function(g,x){function a(f){{f=25;while(f!=70)f==25?f=x?70:45:f==45&&(x=true,R.document.removeEventListener("DOMContentLoaded",a,g8),R.removeEventListener("load",a,g8),g(),f=70)}}if(x=false,{})R.document.addEventListener("DOMContentLoaded",a,g8);R.addEventListener("load",a,g8)});break;case false:try{{V=0;while(V<P.lq.length){try{v=P.lq[V],v[0][v[1]](v[2])}catch(g){}V++}}}catch(g){}(0,F[1])(function(g,x){P.tF(g,true,x)},function(g){(g=!P.K.length&&!P.J,S(0,10,[h1],P),g)&&C(64,0,true,false,P)},function(g){return P.kn(g)},(m=(P.lq=[],P).L(),function(g,x,a){return P.mN(g,x,a)})),P.N+=P.L()-m;break}break;case NaN===Number(undefined)==null:F[3]&&(P.j=true),F[p]&&(P.U=true),P.l(F);break}break;case ![]:y=F[1];while(true){try{U=P.v||P.l(F)}catch(g){F$(g,24,"~",P),U=P.v}if(![]==Number())break}((w=P.L(),y)(U),P).N+=P.L()-w;break}break;case Number(undefined)===NaN:P.U=true,P.HD=25,P.l(F);break}},Tk=function(I,F,p,P,V,U,w,m,L,y,v){for(y=(L=((w.Db=kw(32,19,{get:function(){return this.concat()}},(w.W$=sS,(w.l2=d8,w).P$=w[vX],w.A)),w).xX=CG[w.A](w.Db,{value:{value:{}}}),0),[]);L<340;L++)y[L]=String.fromCharCode(L);w.Kl=((w.uq=0,w.qh=[],w).C6=(v=window.performance||{},[]),void 0);while([])if(w.B$=function(X){return Ww.call(this,32,X)},true)break;w.X=(w.F=void 0,((w.Ez=false,w.dl=V,w).H=1,w.u=((w.K=[],w).lq=(w.bq=0,[]),w.v=(w.g=[],void 0),void 0),w).yq=(w.h=void 0,w.U=false,w.wl=(w.j=false,false),10001),w.QX=[],w.Ll=0,w.m1=(w.G=null,0),w.wm=p,w.Cl=0,w.Gc=[],w.Yn=void 0,w.HD=25,w.N=0,(w.R=0,w).Vq=(w.C=void 0,[]),w);while({})if(w.oA=0,true)break;w.oB=0,w.J=!(w.v$=(w.Oz=void 0,w.u2=v.timeOrigin||(v.timing||{}).navigationStart||0,false),I&&I.length==2&&(w.Vq=I[1],w.C6=I[0]),1);for(![]!=true;P;false){try{w.Oz=JSON.parse(P)}catch(X){w.Oz={}}if(![undefined]==0)break}e(12,(n(339,w,(e(12,319,(n(221,w,[0,(K(440,w,(K((O(188,w,n_((n(113,w,(n(270,w,(e(14,139,(K(79,w,(e(26,370,(e(10,464,(e(24,106,w,(e(28,(e(30,477,(e(12,123,w,(O(229,(e(25,(e(13,(K((e(24,(K(484,w,(e(29,((n(473,w,(e(29,(e(24,(e(28,239,w,function(X,g,x,a,f,A,c,Z,B){for(B=7;B!=60;)B==75?B=1:B==7?(c=b(X,106),x=b(128,85,X),a=[],Z=Y(445,X),f=Z.length,g=0,B=75):B==87?B=1:B==33?(K(c,X,a),B=60):B==1?B=x--?71:33:B==71&&(g=(A=b(128,84,X),2*~(g&A)-3*~g-~A+2*(~g|A))%f,a.push(Z[g]),B=87)}),155),w,function(X,g,x,a,f,A,c,Z,B){{B=79;while(B!=56)B==79?(A=b(X,32),f=b(X,28),c=b(X,96),Z=W(f,X),x=W(A,X),a="",g=0,B=74):B==5?(g++,B=10):B==10?B=g<Z.length?93:32:B==74?B=10:B==32?(O(c,X,x[a]),B=56):B==93&&(a+=String.fromCharCode(Z[g]^121),B=5)}}),321),w,function(X,g,x,a,f,A,c,Z,B){{B=61;while(B!=26)B==61?(g=b(X,42),Z=b(X,96),x=b(X,104),A=T(g,X),f=T(Z,X),c="",a=0,B=41):B==36?B=a<A.length?13:77:B==77?(O(x,X,c in f|0),B=26):B==41?B=36:B==53?(a++,B=36):B==13&&(c+=String.fromCharCode(A[a]^121),B=53)}}),0)),n)(508,w,0),312),w,function(X){HX(4,X)}),n_(4))),311),w,function(X,g,x,a,f,A){{A=86;while(A!=94)A==92?(g++,A=61):A==53?(O(f,X,x),A=94):A==4?(x.push(EM(8,X,true)),A=92):A==61?A=g<a?4:53:A==86?(f=b(X,78),a=b(128,83,X),g=0,x=[],A=8):A==8&&(A=61)}}),504),w,{}),235),w,function(X,g,x,a,f,A,c,Z,B){{B=38;while(B!=92)B==88?(O(c,X,x),B=92):B==18?B=55:B==55?B=A--?5:88:B==38?(c=b(X,28),A=b(128,86,X),x="",a=W(445,X),g=a.length,Z=0,B=68):B==68?B=55:B==5&&(Z=(f=b(128,81,X),-2*~Z+(Z^f)+2*(~Z|f))%g,x+=y[a[Z]],B=18)}}),98),w,function(X,g,x,a,f){for(f=71;f!=82;)f==66?(a[339]=X.g[339],a[270]=X.g[270],X.g=a,f=82):f==55?f=x>0?3:66:f==69?(x=EM(8,X,true),f=50):f==10?(x--,f=55):f==71?(a=X.QX.pop(),f=62):f==3?(g=b(X,14),a[g]=X.g[g],f=10):f==15?(K(473,X,X.R),f=82):f==62?f=a?69:15:f==50&&(f=55)}),w),702),function(X,g,x,a){K((g=b(X,(a=b(X,31),x=b(X,28),42)),g),X,Y(a,X)||W(x,X))})),w),function(X,g,x){n((g=b((x=b(X,41),X),14),g),X,""+Y(x,X))}),329),w,function(X){jG(X,3)}),function(X,g,x,a,f,A,c,Z){a=(c=(A=W((Z=(f=(g=b(X,(x=b(X,14),105)),b)(X,38),b)(X,27),f),X),T(g,X)),W(Z,X)),K(x,X,b(false,16,1,A,X,a,c))})),w),function(X,g){SG(469,0,104,(g=T(b(X,40),X),X.X),473,g)}),w),function(X,g,x,a,f,A){n((f=(A=b(X,(a=b(X,(g=b(X,96),43)),27)),x=T(a,X),Y(g,X)==x),A),X,+f)}),0)),w),function(X,g,x,a,f,A,c,Z,B,d,H){for(H=10;H!=76;)H==10?(B=b(X,38),f=b(X,78),c=b(X,56),g=b(X,70),Z=T(B,X.X),A=W(g,X),d=Y(f,X),x=W(c,X),H=90):H==47?(a=b(false,18,1,A,X,1,x,Z,d),Z.addEventListener(d,a,g8),W(241,X).push(function(){Z.removeEventListener(d,a,g8)}),n(382,X,[Z,d,a]),H=76):H==90&&(H=Z!==0?47:76)}),[2048])),[])),4))),89),w,R),[])),0),0]),w),function(X,g,x,a,f){a=md("object","null",(x=(f=(g=b(X,102),b(X,107)),T(g,X)),x)),O(f,X,a)}),[])),495),w,function(X,g,x,a,f,A,c,Z,B,d,H,vw,z,q,k){for(k=31;k!=10;)if(k==95)k=md("object","null",Z)=="object"?35:13;else if(k==13)k=X.X==X?51:10;else if(k==8)f+=z,k=41;else if(k==71)k=41;else if(k==35){for(d in A=[],Z)A.push(d);Z=(k=13,A)}else k==83?(H=b(X,28),B=b(X,43),x=b(X,45),a=b(X,32),Z=W(H,X),c=W(a,X),z=Y(x,X),vw=T(B,X),k=95):k==41?k=f<q?0:10:k==51?(q=Z.length,f=0,z=z>0?z:1,k=71):k==0?(vw(Z.slice(f,(f|0)+(z|0)),c),k=8):k==31&&(k=F$(X,19,0,true,g,true)?10:83)});while(Number()==![""])if(O(382,w,0),NaN!==NaN)break;C(16,0,!(S((S(0,47,(((new D5(((e((O(104,w,(e(14,138,(e(8,10,w,(w.GO=(e(10,29,(e(25,200,w,(e(8,(e(8,320,(K(280,w,n_((e(25,(O(241,(e(9,(K(469,(e(10,378,w,(K(369,w,((e(26,(e(26,161,w,(e(9,(e(13,(e(13,57,(e(30,147,w,function(X,g,x){(x=(g=b(X,61),Y)(g,X.X),x)[0].removeEventListener(x[1],x[2],g8)}),w),function(X,g,x,a,f,A){{A=36;while(A!=20)A==36?A=F$(X,15,0,true,g,false)?20:62:A==80?A=X.X==X||x==X.B$&&a==X?44:20:A==62?(f=ux(27,38,true,X,1),x=f.gm,a=f.MI,A=80):A==44&&(O(f.L6,X,x.apply(a,f.Z)),X.Ll=X.L(),A=20)}}),70),w,function(X){Q(24,4,0,X)}),159),w,function(X,g,x,a){K((g=b(X,(x=EM(8,(a=b(X,27),X),true),70)),g),X,T(a,X)>>>x)}),function(X,g,x,a,f,A,c,Z,B,d){for(d=91;d!=45;)d==91?d=F$(X,7,0,true,g,false)?45:6:d==6&&(Z=ux(27,38,true,X.X,1),f=Z.L6,x=Z.MI,B=Z.Z,A=B.length,a=Z.gm,c=A==0?new x[a]:A==1?new x[a](B[0]):A==2?new x[a](B[0],B[1]):A==3?new x[a](B[0],B[1],B[2]):A==4?new x[a](B[0],B[1],B[2],B[3]):2(),n(f,X,c),d=45)})),377),w,function(X,g){(g=b(X,44),K)(g,X,[])}),w).Oi=0,{})),function(X,g,x,a){(x=(a=b(X,(g=b(X,40),62)),T)(a,X),T(g,X))!=0&&K(473,X,x)})),w.Qq=0,w),[]),17),w,function(X,g,x,a,f,A){O((g=(x=(a=b(X,(f=(A=b(X,38),b)(X,32),96)),W(f,X)),T)(A,X),a),X,g in x|0)}),w),[]),337),w,function(X,g,x,a,f){(f=T((g=(x=b(X,109),b(X,111)),x),X),a=W(g,X),n)(g,X,a+f)}),4))),w),function(X,g,x,a,f,A,c){{c=65;while(c!=94)c==47?(X.h=D(false,32,X),X.u=void 0,c=94):c==53?c=a==2?47:94:c==87?c=X.X==X?99:94:c==58?c=x==413?41:94:c==65?(x=b(X,32),A=b(X,14),f=b(X,38),c=87):c==99?(g=W(f,X),a=Y(A,X),T(x,X)[a]=g,c=58):c==41&&(X.u=void 0,c=53)}}),266),w,function(X){HX(1,X)}),function(){})),w),function(X){jG(X,4)}),0),function(X,g,x,a,f,A,c,Z,B,d,H,vw,z,q,k,Vj,u,M){{u=26;while(u!=22)u==75?u=32:u==51?(A=((x|1)-2*~x+3*~(x|1)-(~x^1)).toString(2).length,d=[],H=0,u=9):u==9?u=27:u==26?(M=function(N,ID){for(;c<N;)a|=EM(8,X,true)<<c,c+=8;return a>>=(ID=(c-=N,a&(1<<N)-1),N),ID},z=b(X,78),c=a=0,Vj=(M(3)|0)+1,B=M(5),x=0,Z=[],g=0,u=50):u==8?u=k<B?7:79:u==17?u=g<B?67:51:u==63?(e(14,z,X,function(N,ID,xw,l,cw,h){for(h=80;h!=72;)h==25?h=12:h==2?h=12:h==64?(xw=cw[xw],h=88):h==46?h=44:h==88?(ID.push(xw),h=78):h==12?h=xw>=cw.length?32:64:h==44?h=l<B?82:41:h==85?h=Z[l]?88:25:h==41?(N.C=Q(11,N,vw.slice()),N.F=Q(12,N,ID),h=72):h==80?(cw=[],ID=[],l=0,h=46):h==32?(cw.push(b(N,70)),h=2):h==78?(l++,h=44):h==82&&(xw=d[l],h=85)}),u=22):u==90?(Z[H]||(d[H]=M(A)),u=65):u==49?(k++,u=8):u==44?(g++,u=17):u==20?(vw.push(T(b(X,31),X)),u=75):u==43?(k=0,u=71):u==65?(H++,u=27):u==27?u=H<B?90:43:u==71?u=8:u==79?(f=Vj,vw=[],u=72):u==50?u=17:u==72?u=32:u==7?(Z[k]&&(d[k]=b(X,78)),u=49):u==32?u=f--?20:63:u==67&&(q=M(1),Z.push(q),x+=q?0:1,u=44)}})),w),function(X,g,x,a,f){for(f=39;f!=71;)f==19?(x=b(X,31),a=b(X,41),O(a,X,function(A){return eval(A)}(Qx(Y(x,X.X)))),f=71):f==39&&(f=F$(X,11,0,true,g,false)?71:19)}),[154,0,0])),9),112,w,function(X,g,x,a,f,A){O((g=(f=b(X,(a=b(X,102),57)),A=b(X,108),T(a,X)),x=Y(f,X),A),X,g[x])}),O)(475,w,w),"Submit"))).dispose(),U)||S(0,14,[LG],w),[WX,m]),w),0),42,[K_,F],w),0),true,w)},eG=function(I,F,p,P,V,U,w,m,L,y,v,X,g){for((1).Z;!F.Ez&&(X=void 0,I&&I[0]===kZ&&(X=I[2],P=I[1],I=void 0),w=T(339,F),w.length==0&&(m=Y(508,F)>>3,w.push(P,m>>8&255,(m|255)-(m&-256)+(~m^255)-(~m|255)),X!=void 0&&w.push(X&255)),L="",I&&(I.message&&(L+=I.message),I.stack&&(L+=":"+I.stack)),U=T(270,F),U[0]>3);undefined){F.X=(L=L.slice(0,(V=U[0],(V|3)-3*(V&3)-2*~V+2*(~V^3))),U[0]-=(L.length|0)+3,L=qk(L,192),g=F.X,F);try{F.wl?(y=(y=W(p,F))&&y[y.length-1]||95,(v=W(440,F))&&v[v.length-1]==y||ix(440,F,[(y|255)-~(y&255)+~(y|255)])):ix(p,F,[95]),ix(484,F,G(L.length,2).concat(L),51)}finally{F.X=g}if(true)break}},r=function(I,F,p,P,V,U,w,m){m=this;try{Tk(p,F,I,P,w,U,this,V)}catch(L){F$(L,32,"~",this),F(function(y){y(m.v)})}},D=function(I,F,p,P,V,U,w,m,L,y,v,X,g,x,a,f,A){if(U=W(473,p),U>=p.R)throw[kZ,31];for(g=(L=F,p.P$.length),X=0,v=U;L>0;)w=v>>3,A=p.qh[w],P=v%8,x=8-(P|0),f=x<L?x:L,I&&(m=p,y=v,m.u!=y>>6&&(m.u=y>>6,V=T(413,m),m.Yn=t1(8,m.u,m.h,0,[0,0,V[1],V[2]])),A^=p.Yn[w&g]),v+=f,X|=(A>>8-(P|0)-(f|0)&(1<<f)-1)<<(L|0)-(f|0),L-=f;return n(473,(a=X,p),(U|0)+(F|0)),a},K=function(I,F,p){if(I==473||I==508)F.g[I]?F.g[I].concat(p):F.g[I]=Q(9,F,p);else{for(0;F.Ez&&I!=413;![]==0!=[]){return;if("F")break}I==104||I==484||I==113||I==188||I==339||I==469||I==440||I==221||I==280||I==270?F.g[I]||(F.g[I]=Q(3,F,6,p,22,I)):F.g[I]=Q(3,F,6,p,129,I)}I==413&&(F.h=D(false,32,F),F.u=void 0)},md=function(I,F,p,P,V){if(P=typeof p,P==I)switch(!p){case true:return F;break;case ![]!=0:if(p instanceof Array)return"array";if(p instanceof Object)return P;V=Object.prototype.toString.call(p);while(V=="[object Window]"){return I;if("O")break}if(V=="[object Array]"||typeof p.length=="number"&&typeof p.splice!="undefined"&&typeof p.propertyIsEnumerable!="undefined"&&!p.propertyIsEnumerable("splice"))return"array";if(V=="[object Function]"||typeof p.call!="undefined"&&typeof p.propertyIsEnumerable!="undefined"&&!p.propertyIsEnumerable("call"))return"function";break}else if(P=="function"&&typeof p.call=="undefined")return I;return P},l7=function(){return AF.call(this,43,48)},eh=function(I){return aD.call(this,9,18,I)},ix=function(I,F,p,P,V,U,w,m,L){while(F.X==F){{V=Y(I,F),I==484||I==280||I==188?(w=function(y,v,X,g,x,a,f,A,c){for(f=92,A=78;;)try{if(f==25)break;else if(f==43)V.AF=x,v=(a=x<<3,1-(~a^4)+2*(a|-5)),X=[0,0,U[1],U[2]],f=95;else if(f==95)A=80,V.sz=t1(8,Q(65,-~(v&4)+-10-3*~(v|4)+2*(~v|4),8,V),Q(67,v,8,V),0,X),f=63;else{if(f==44)throw A=78,c;f==63?(V.push(V.sz[g&7]^y),f=25):f==92?(g=V.length,x=(g|0)-4>>3,f=0):f==0&&(f=V.AF!=x?43:63)}}catch(Z){if(A==78)throw Z;A==80&&(c=Z,f=44)}},U=Y(221,F)):w=function(y){V.push(y)},P&&w(256+(P|-256)),m=0,L=p.length;while(m<L)w(p[m]),m++}if(!![]!=[])break}},Yw=function(I,F,p,P,V,U,w,m,L){return Ww.call(this,20,I,F,p,P,V,U,w,m,L)},JF=function(){return u7.call(this,50,6)},Vx=function(I,F){return AF.call(this,43,8,I,F)},Gk=function(I,F,p,P,V,U){return yj.call(this,22,F,5,I,p,P,V,U)},lx=function(I,F,p,P,V,U,w,m,L){if(p.X==p){{w=T(I,p),I==484||I==280||I==188?(m=function(y,v,X,g,x,a,f,A,c){for(c=(A=49,40);;)try{if(A==34)break;else if(A==84)A=w.AF!=X?60:58;else if(A==49)v=w.length,X=(v|0)-4>>3,A=84;else if(A==77)c=32,w.sz=t1(8,Q(64,-~(x&4)+-10-3*~(x|4)+2*(~x|4),8,w),Q(66,x,8,w),0,g),A=58;else if(A==58)w.push(w.sz[v&7]^y),A=34;else if(A==60)w.AF=X,x=(a=X<<3,1-(~a^4)+2*(a|-5)),g=[0,0,L[1],L[2]],A=77;else if(A==79)throw c=40,f;}catch(Z){if(c==40)throw Z;c==32&&(f=Z,A=79)}},L=Y(221,p)):m=function(y){w.push(y)},P&&m(256+(P|-256)),V=0,U=F.length;while(V<U)m(F[V]),V++}}},I2=function(I,F){function p(){(this.n=0,this).O=[]}return[function(P){I.Za(P),F.Za(P)},(F=(I=((p.prototype.i2=function(){return $Z.call(this,14)},p).prototype.Za=function(P,V){return sM.call(this,64,P,34,V)},new p),new p),function(P){return P=I.i2().concat(F.i2()),F=new p,P})]},b7=function(I){return kw.call(this,32,66,I)},r8=function(){return Tj.call(this,24,5)},SG=function(I,F,p,P,V,U){if(true)P.QX.length>p?eG([kZ,36],P,I,F):(P.QX.push(P.g.slice()),P.g[V]=void 0,K(V,P,U))},jG=function(I,F,p,P,V,U,w){(U=(P=(w=(p=-~(F|4)-(V=(F|3)-(F&-4)-(~F&3),~F&4)+(~F|4),b(I,78)),b)(I,14),T)(w,I),p&&(U=qk(""+U,192)),V&&lx(P,G(U.length,2),I),lx)(P,U,I)},YZ=function(){return UM.call(this,41,59)},O=function(I,F,p){if(I==473||I==508)F.g[I]?F.g[I].concat(p):F.g[I]=Q(10,F,p);else{switch(!(F.Ez&&I!=413)){case !![]:undefined;break;case false==null:return;break}I==104||I==484||I==113||I==188||I==339||I==469||I==440||I==221||I==280||I==270?F.g[I]||(F.g[I]=Q(5,F,6,p,22,I)):F.g[I]=Q(7,F,6,p,129,I)}while(true)if(![(I==413&&(F.h=D(false,32,F),F.u=void 0),"")]==0)break},t1=function(I,F,p,P,V,U,w,m){m=(w=P,V[3]|P);{U=V[2]|P;while(w<14)F=F>>>I|F<<24,F+=p|P,p=p<<3|p>>>29,F^=U+2925,m=m>>>I|m<<24,p^=F,m+=U|P,m^=w+2925,U=U<<3|U>>>29,U^=m,w++}return[p>>>24&255,p>>>16&255,p>>>I&255,p>>>P&255,F>>>24&255,F>>>16&255,F>>>I&255,F>>>P&255]},HX=function(I,F,p,P){(p=(P=b(F,102),b)(F,27),lx)(p,G(W(P,F),I),F)},Fx=function(I,F,p,P,V){while(I.length==3){for(P=0;P<3;P++)F[P]+=I[P];for(V=(p=[13,8,13,12,16,5,3,10,15],0);V<9;V++)F[3](F,V%3,p[V]);if(true)break}},Vy=function(I,F,p,P,V,U){try{while("n")if(V=I[((F|0)+2)%3],I[F]=(U=I[F],P=I[(-3*~F+-2+2*(~F^1)+4*(~F&1))%3],-(U&P)-~U+(U|~P))-(V|0)^(F==1?V<<p:V>>>p),11)break}catch(w){throw w;}},T=function(I,F,p){if(p=F.g[I],p===void 0)throw[kZ,30,I];if(p.value)return p.create();return(p.create(I*4*I+91*I+15),p).prototype},Mk=function(I,F){return yj.call(this,22,F,18,I)},jh=function(){return UM.call(this,41,21)},D5=function(I,F,p){return tF.call(this,0,3,I,5,F,p)},qk=function(I,F,p,P,V,U,w,m,L,y,v,X,g,x,a){x=I.replace(/\\r\\n/g,"\\n"),w=[];{y=P=0;while(y<x.length)V=x.charCodeAt(y),V<128?w[P++]=V:(V<2048?w[P++]=(L=V>>6,-(L&F)-2*~(L&F)+3*(L^F)+2*(~L^F)):((V&64512)==55296&&y+1<x.length&&(U=x.charCodeAt(y+1),(U|0)+~U-~(U|64512)-(U^64512))==56320?(V=(v=(V&1023)<<10,3*(65536&v)+~(65536&v)-(-65537^v))+(g=x.charCodeAt(++y),-2*~(g&1023)-1+~(g|1023)+(g^1023)),w[P++]=(m=V>>18,-~m+(m&-241)-(~m^240)+2*(~m|240)),w[P++]=(a=V>>12&63,-2*~(a&128)-1+~(a|128)+2*(a^128))):w[P++]=V>>12|224,w[P++]=(X=V>>6,(X|63)- -1+(~X^63))|128),w[P++]=(p=-~(V&63)+-64-~(V|63)+(~V|63),1-~p+3*(~p&128)+2*(p|-129))),y++}return w},OS=function(I,F,p,P,V,U){return W(504,(O(473,(bx(229,((U=W(473,p),p.qh)&&U<p.R?(O(473,p,p.R),SG(469,I,104,p,473,V)):K(473,p,V),P),p,F),p),U),p))},oT=function(I,F){function p(){this.S=this.WD=this.n=0}return[(F=(I=(p.prototype.jy=function(P,V){return tF.call(this,0,3,P,10,V)},p.prototype.f6=function(){return nG.call(this,34,16)},new p),new p),function(P){(I.jy(P),F).jy(P)}),function(P){if(F=new (P=[I.f6(),F.f6(),I.S,F.S],p),true)return P}]},xZ=function(I,F,p){return p=I.create().shift(),F.C.create().length||F.F.create().length||(F.C=void 0,F.F=void 0),p},Qj=function(I,F,p,P,V,U){return US.call(this,I,34,F,p,P,V,U)},MA=function(I,F,p,P,V,U,w,m){return nG.call(this,34,7,I,F,p,P,V,U,w,m)},G=function(I,F,p,P,V){for(P=(V=(F|1)+~(F|1)+(~F^1)-2*(~F|1),[]);V>=0;V--)P[(F|0)-1-(V|0)]=(p=I>>V*8,(p|0)+255-(p|255));return P},Py=function(I,F,p,P,V,U,w,m,L,y,v,X){(F.push((L=(w=I[0]<<24,m=I[1]<<16,(w|0)-~(w&m)+~w+(w^m))|I[2]<<8,U=I[3],-(U|0)-1-2*~(L|U)+(~L|U))),F.push((p=(V=I[4]<<24,v=I[5]<<16,(V|0)+~V-~(V|v)),y=I[6]<<8,(p|0)+(p&~y)-(p^y)+2*(~p&y))|I[7]),F).push((X=I[8]<<24|I[9]<<16,P=I[10]<<8,-~X+2*(~X&P)+(X|~P))|I[11])},EM=function(I,F,p){return F.C?xZ(F.F,F):D(p,I,F)},pn=function(I,F){for(var p=25;p!=75;)if(p==50){var P=Xx[U];Object.prototype.hasOwnProperty.call(V,P)&&(I[P]=V[P]),p=93}else if(p==64)p=w<arguments.length?98:75;else if(p==29)w++,p=64;else if(p==98){var V=arguments[w];for(P in V)I[P]=V[P];var U=(p=66,0)}else if(p==87)p=64;else if(p==93)U++,p=85;else if(p==85)p=U<Xx.length?50:29;else if(p==66)p=85;else if(p==25)var w=(p=87,1)},n=function(I,F,p){if(I==473||I==508)F.g[I]?F.g[I].concat(p):F.g[I]=Q(13,F,p);else{while(F.Ez&&I!=413){return;if(10)break}I==104||I==484||I==113||I==188||I==339||I==469||I==440||I==221||I==280||I==270?F.g[I]||(F.g[I]=Q(6,F,6,p,22,I)):F.g[I]=Q(8,F,6,p,129,I)}I==413&&(F.h=D(false,32,F),F.u=void 0)},Y=function(I,F,p){if(p=F.g[I],p===void 0)throw[kZ,30,I];if(p.value)return p.create();return p.create(I*4*I+91*I+15),p.prototype},f_=UM(41,3,"Math","object",0,this),R=($Z(5,0,null,".",1,"Symbol",function(I,F,p,P,V,U){for(V=42;V!=22;){if(V==79)return I;if(V==72)V=I?79:20;else if(V==42)P=function(w,m){this.b2=w,A1(this,"description",{configurable:true,writable:true,value:m})},U=function(w,m){for(m=12;m!=91;)if(m==12)m=this instanceof U?17:50;else{if(m==50)return new P(p+(w||"")+"_"+F++,w);if(m==17)throw new TypeError("Symbol is not a constructor");}},V=72;else if(V==20)return P.prototype.toString=function(){return this.b2},p="jscomp_symbol_"+(Math.random()*1E9>>>0)+"_",F=0,U}}),this||self),F1="closure_uid_"+(Math.random()*1E9>>>0),X1=0,Bw,p_=function(I,F,p,P,V,U){P=49;{V=42;while(5)try{if(P==54)break;else if(P==49)P=R.addEventListener&&Object.defineProperty?13:63;else if(P==57)V=22,F=function(){},R.addEventListener("test",F,I),R.removeEventListener("test",F,I),P=35;else{if(P==35)return V=42,p;if(P==13)p=false,I=Object.defineProperty({},"passive",{get:function(){p=true}}),P=57;else{if(P==63)return false;P==97&&(V=42,P=35)}}}catch(w){if(V==42)throw w;V==22&&(U=w,P=97)}}}(),i7=((OM(7,2,((Vx.prototype.stopPropagation=function(){this.yX=true},((Vx.prototype.preventDefault=function(){this.defaultPrevented=true},jh).prototype.Y=false,jh.prototype).dispose=function(I){for(I=97;I!=13;)I==64?(this.Y=true,this.V(),I=13):I==97&&(I=this.Y?13:64)},jh).prototype[Symbol.dispose]=(jh.prototype.V=function(I){{I=23;while(I!=52)I==84?I=40:I==66?I=40:I==23?I=this.aB?66:52:I==40?I=this.aB.length?27:52:I==27&&(this.aB.shift()(),I=84)}},function(){this.dispose()}),16),BX,Vx),BX.prototype).init=function(I,F,p,P,V,U){{U=78;while(U!=96)U==74?(P=I.fromElement,U=50):U==37?U=P?50:33:U==78?(p=this.type=I.type,V=I.changedTouches&&I.changedTouches.length?I.changedTouches[0]:null,this.target=I.target||I.srcElement,this.currentTarget=F,P=I.relatedTarget,U=37):U==70?(this.button=I.button,this.keyCode=I.keyCode||0,this.key=I.key||"",this.charCode=I.charCode||(p=="keypress"?I.keyCode:0),this.ctrlKey=I.ctrlKey,this.altKey=I.altKey,this.shiftKey=I.shiftKey,this.metaKey=I.metaKey,this.pointerId=I.pointerId||0,this.pointerType=I.pointerType,this.state=I.state,this.timeStamp=I.timeStamp,this.gl=I,I.defaultPrevented&&BX.D.preventDefault.call(this),U=96):U==42?(this.offsetX=I.offsetX,this.offsetY=I.offsetY,this.clientX=I.clientX!==void 0?I.clientX:I.pageX,this.clientY=I.clientY!==void 0?I.clientY:I.pageY,this.screenX=I.screenX||0,this.screenY=I.screenY||0,U=70):U==33?U=p=="mouseover"?74:32:U==50?(this.relatedTarget=P,U=35):U==89?(P=I.toElement,U=50):U==55?(this.clientX=V.clientX!==void 0?V.clientX:V.pageX,this.clientY=V.clientY!==void 0?V.clientY:V.pageY,this.screenX=V.screenX||0,this.screenY=V.screenY||0,U=70):U==32?U=p=="mouseout"?89:50:U==35&&(U=V?55:42)}},BX.prototype.stopPropagation=function(){BX.D.stopPropagation.call(this),this.gl.stopPropagation?this.gl.stopPropagation():this.gl.cancelBubble=true},BX.prototype.preventDefault=function(I){I=(BX.D.preventDefault.call(this),this.gl),I.preventDefault?I.preventDefault():I.returnValue=false},"closure_listenable_"+(Math.random()*1E6|0)),PX=0,Xx="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" "),hF=(eh.prototype.hasListener=((eh.prototype.ey=function(I,F,p,P,V,U){return U=(V=-1,this.i)[p.toString()],U&&(V=RD(I,U,7,0,F,P)),V>-1?U[V]:null},eh.prototype).remove=(eh.prototype.add=function(I,F,p,P,V,U,w,m,L,y){{y=54;while(y!=72)if(y==66)w=RD(P,m,3,0,F,V),y=33;else if(y==44)U=m[w],y=78;else if(y==99)m=this.i[L]=[],this.vD++,y=66;else if(y==15)y=m?66:99;else if(y==78)y=p?91:64;else{if(y==91)return U;y==33?y=w>-1?44:12:y==64?(U.zc=false,y=91):y==54?(L=I.toString(),m=this.i[L],y=15):y==12&&(U=new cX(L,!!P,V,this.src,F),U.zc=p,m.push(U),y=91)}}},function(I,F,p,P,V,U,w,m){{m=83;while(m!=34)if(m==86)V=this.i[w],U=RD(p,V,6,0,F,P),m=54;else if(m==73)delete this.i[w],this.vD--,m=38;else if(m==88)m=w in this.i?86:19;else{if(m==75||m==19)return false;if(m==58)Pw(15,true,12,V[U]),Array.prototype.splice.call(V,U,1),m=4;else if(m==4)m=V.length==0?73:38;else if(m==54)m=U>-1?58:75;else if(m==83)w=I.toString(),m=88;else if(m==38)return true}}}),function(I,F,p,P,V){return D7(true,(p=(P=I!==(V=F!==void 0,void 0))?I.toString():"",false),40,this.i,function(U,w,m){for(m=65;m!=67;){if(m==63)return true;if(m==9)m=w<U.length?96:59;else if(m==93)++w,m=9;else if(m==65)w=0,m=92;else{if(m==59)return false;m==96?m=P&&U[w].type!=p||V&&U[w].capture!=F?93:63:m==92&&(m=9)}}})}),"closure_lm_")+(Math.random()*1E6|0),w8={},Gj=0,J1="__closure_events_fn_"+(Math.random()*1E9>>>0);((((t=((OM(7,2,20,$w,jh),$w.prototype)[i7]=true,$w.prototype),t).Nh=function(I){this.hF=I},t).addEventListener=function(I,F,p,P){NA(null,p,8,P,F,true,this,I)},t.removeEventListener=function(I,F,p,P){US(0,39,null,P,p,F,I,this)},t.dispatchEvent=function(I,F,p,P,V,U,w,m,L,y,v,X){for(X=13;X!=35;)if(X==85)F.push(v),X=97;else{if(X==63)return L;X==61?(F=[],X=92):X==38?X=!P.yX&&U<V.length?74:63:X==98?(P=new Vx(P,p),X=53):X==57?(w=P,P=new Vx(m,p),pn(P,w),X=53):X==48?X=P instanceof Vx?39:57:X==72?(P=I,m=P.type||P,p=this.p6,V=F,X=75):X==67?X=V?55:86:X==74?(y=P.currentTarget=V[U],L=NA(true,P,5,m,false,y)&&L,X=17):X==26?X=v?85:72:X==13?(v=this.hF,X=28):X==77?(U--,X=91):X==91?X=!P.yX&&U>=0?5:86:X==55?(U=V.length-1,X=82):X==92?X=26:X==40?X=38:X==5?(y=P.currentTarget=V[U],L=NA(true,P,7,m,true,y)&&L,X=77):X==44?(y=P.currentTarget=p,L=NA(true,P,6,m,true,y)&&L,P.yX||(L=NA(true,P,3,m,false,y)&&L),X=25):X==39?(P.target=P.target||p,X=53):X==75?X=typeof P==="string"?98:48:X==86?X=P.yX?25:44:X==97?(v=v.hF,X=26):X==28?X=v?61:72:X==25?X=V?51:63:X==82?X=91:X==53?(L=true,X=67):X==17?(U++,X=38):X==51&&(U=0,X=40)}},t).V=function(){($w.D.V.call(this),this.B&&UM(41,8,0,true,this.B),this).hF=null},t.ey=function(I,F,p,P){return this.B.ey(I,F,String(p),P)},t).hasListener=function(I,F){return this.B.hasListener(I!==void 0?String(I):void 0,F)};var gD;US(YZ,((((((("ARTICLE SECTION NAV ASIDE H1 H2 H3 H4 H5 H6 HEADER FOOTER ADDRESS P HR PRE BLOCKQUOTE OL UL LH LI DL DT DD FIGURE FIGCAPTION MAIN DIV EM STRONG SMALL S CITE Q DFN ABBR RUBY RB RT RTC RP DATA TIME CODE VAR SAMP KBD SUB SUP I B U MARK BDI BDO SPAN BR WBR NOBR INS DEL PICTURE PARAM TRACK MAP TABLE CAPTION COLGROUP COL TBODY THEAD TFOOT TR TD TH SELECT DATALIST OPTGROUP OPTION OUTPUT PROGRESS METER FIELDSET LEGEND DETAILS SUMMARY MENU DIALOG SLOT CANVAS FONT CENTER ACRONYM BASEFONT BIG DIR HGROUP STRIKE TT".split(" ").concat(["BUTTON","INPUT"]),t=JF.prototype,t.o=function(I){return typeof I==="string"?this.VX.getElementById(I):I},t).getElementsByTagName=function(I,F){return(F||this.VX).getElementsByTagName(String(I))},t).createElement=function(I,F,p){return(p=String(I),F=this.VX,F.contentType==="application/xhtml+xml"&&(p=p.toLowerCase()),F).createElement(p)},t).createTextNode=function(I){return this.VX.createTextNode(String(I))},t).appendChild=function(I,F){I.appendChild(F)},t).append=function(I,F){D7(null,1,24,"","number",I.nodeType==9?I:I.ownerDocument||I.document,arguments,I)},t.canHaveChildren=function(I,F){for(F=29;F!=89;){if(F==51)return false;if(F==25){switch(I.tagName){case "APPLET":case "AREA":case "BASE":case "BR":case "COL":case "COMMAND":case "EMBED":case "FRAME":case "HR":case "IMG":case "INPUT":case "IFRAME":case "ISINDEX":case "KEYGEN":case "LINK":case "NOFRAMES":case "NOSCRIPT":case "META":case "OBJECT":case "PARAM":case "SCRIPT":case "SOURCE":case "STYLE":case "TRACK":case "WBR":return false}return true}F==29&&(F=I.nodeType!=1?51:25)}},t).removeNode=Z5,t.contains=function(I,F,p){{p=97;while(p!=85)if(p==27)p=I.contains&&F.nodeType==1?61:35;else{if(p==93)return F==I;if(p==88)return false;if(p==97)p=I&&F?27:88;else{if(p==61)return I==F||I.contains(F);if(p==83)p=38;else if(p==38)p=F&&I!=F?23:93;else if(p==49)p=38;else if(p==23)F=F.parentNode,p=49;else if(p==35)p=typeof I.compareDocumentPosition!="undefined"?30:83;else if(p==30)return I==F||!!(I.compareDocumentPosition(F)&16)}}}},69)),YZ.prototype.n6="";while(0===-0)if(false==(YZ.prototype.aA=0,![]))break;(((((((OM(7,2,22,b7,$w),t=b7.prototype,t).Ei=YZ.IB(),t).o=function(){return this.W},t).getParent=function(){return this.fl},t).Xx=function(){this.Tc=((Tj(24,18,function(I){I.Tc&&I.Xx()},this),this.iq)&&UM(41,9,0,true,this.iq),false)},t).V=function(I){{I=21;while(I!=84)I==72?I=this.iq?81:6:I==6?(Tj(24,19,function(F){F.dispose()},this),!this.Ac&&this.W&&Z5(this.W),this.BD=this.cD=this.W=this.fl=null,b7.D.V.call(this),I=84):I==21?(this.Tc&&this.Xx(),I=72):I==81&&(this.iq.dispose(),delete this.iq,I=6)}},t).Nh=function(I,F){for(F=74;F!=95;)if(F==64)b7.D.Nh.call(this,I),F=95;else{if(F==11)throw Error("Method not supported");F==74&&(F=this.fl&&this.fl!=I?11:64)}},t).removeChild=function(I,F,p,P,V,U,w,m,L,y,v,X,g){{g=25;while(g!=85)if(g==72)I=P,g=29;else if(g==89)V=this.cD,v in V&&delete V[v],yj(22,I,25,0,this.BD),g=63;else{if(g==43)return I;if(g==83)m.fl=null,b7.D.Nh.call(m,null),g=52;else if(g==11)v=w,g=44;else if(g==78)P=null,g=72;else if(g==34)g=(L=I.qI)?20:3;else if(g==3)p=I,U=I.Ei,y=U.n6+":"+(U.aA++).toString(36),L=p.qI=y,g=20;else if(g==74)I.Xx(),I.W&&Z5(I.W),g=16;else{if(g==75)throw Error("Child is not in parent component");if(g==20)w=L,g=11;else if(g==25)g=I?40:52;else if(g==56)X=this.cD,P=(X!==null&&v in X?X[v]:void 0)||null,g=72;else if(g==44)g=this.cD&&v?56:78;else if(g==60)g=m==null?7:83;else if(g==29)g=v&&I?89:52;else if(g==52)g=I?43:75;else if(g==91)w=I,g=11;else if(g==63)g=F?74:16;else if(g==40)g=typeof I==="string"?91:34;else if(g==16)m=I,g=60;else if(g==7)throw Error("Unable to set parent component");}}}};var w5,Uk=(t=(US(r8,67),r8.prototype),t.JF=function(I,F,p,P,V,U,w,m,L){for(w=(L=76,77);;)try{if(L==10)break;else L==91?L=U!=F?61:10:L==32?L=RD(I,32,21,2)?49:98:L==53?(p=P.tabIndex,U=typeof p==="number"&&p>=0&&p<32768,L=91):L==77?(w=4,P.blur(),L=52):L==76?L=Z7(32,9,I)&&(P=I.Fx())?41:10:L==46?(V.tabIndex=-1,V.removeAttribute("tabIndex"),L=10):L==98?L=(U=P.hasAttribute("tabindex"))?53:91:L==61?(V=P,L=11):L==49?(I.Uz&4&&Z7(4,10,I)&&I.setActive(false),I.Uz&32&&Z7(32,14,I)&&kw(32,7,0,I,false,32)&&I.P(false,32),L=98):L==71?(V.tabIndex=0,L=10):L==43?(w=77,L=52):L==52?(w=77,L=32):L==41?L=!F&&RD(I,32,24,2)?77:98:L==11&&(L=F?71:46)}catch(y){if(w==77)throw y;w==4&&(m=y,L=43)}},t.PD=function(I,F,p,P,V,U,w,m){(P=((w=I.getAttribute((w5||(w5={1:"disabled",8:"selected",16:"checked",64:"expanded"}),U=w5[F],"role"))||null)?(V=Uk[w]||U,m=U=="checked"||U=="selected"?V:U):m=U,m))&&aD(9,22,"aria-","hidden",p,P,I)},t.pl=function(I,F,p,P){(P=F.o?F.o():F)&&(p?C_:Mk)(P,[I])},{button:"pressed",checkbox:"checked",menuitem:"selected",menuitemcheckbox:"checked",menuitemradio:"checked",radio:"checked",tab:"selected",treeitem:"selected"}),dD=(US((OM((t.P=function(I,F,p,P,V,U,w){for(w=76;w!=57;)w==14?w=this.rl?99:37:w==76?(U=F.o(),w=13):w==99?((P=this.rl[I])&&this.pl(P,F,p),this.PD(U,I,p),w=57):w==13?w=U?14:57:w==37&&(V=this.Xh(),V.replace(/\\xa0|\\s/g," "),this.rl={1:V+"-disabled",2:V+"-hover",4:V+"-active",8:V+"-selected",16:V+"-checked",32:V+"-focused",64:V+"-open"},w=99)},t.Fx=(t.Xh=function(){return"goog-control"},function(I){return I.o()}),7),2,19,Nk,r8),Nk),68),{});if(typeof MA!==((((((((((OM(7,2,17,MA,(Nk.prototype.PD=(Nk.prototype.Xh=function(){return"goog-button"},function(I,F,p){switch(F){case 8:case 16:aD(9,30,"aria-","hidden",p,"pressed",I);break;default:case 64:case 1:Nk.D.PD.call(this,I,F,p)}}),b7)),t=MA.prototype,t.Uz=255,t.Mh=0,t).hc=0,t.si=true,t).Fx=function(){return this.T.Fx(this)},t.Xx=function(){((MA.D.Xx.call(this),this.nl)&&this.nl.detach(),this.isVisible()&&this.isEnabled())&&this.T.JF(this,false)},t).pl=function(I,F,p){for(p=7;p!=95;)p==99?p=F&&this.I&&yj(22,F,26,0,this.I)?24:95:p==24?p=this.I.length==0?32:2:p==16?(this.I?C(52,1,F,this.I)>=0||this.I.push(F):this.I=[F],this.T.pl(F,this,true),p=95):p==2?(this.T.pl(F,this,false),p=95):p==7?p=I?65:99:p==65?p=F?16:95:p==32&&(this.I=null,p=2)},t).K6=39,t).V=function(I){{I=22;while(I!=68)I==17?(delete this.T,this.I=null,I=68):I==5?(this.nl.dispose(),delete this.nl,I=17):I==97?I=this.nl?5:17:I==22&&(MA.D.V.call(this),I=97)}},t.I=null,t).isVisible=function(){return this.si},t.isEnabled=function(){return!RD(this,1,20,2)},t).isActive=function(){return RD(this,4,17,2)},t).setActive=function(I){kw(32,6,0,this,I,4)&&this.P(I,4)},t.getState=function(){return this.Mh},t).P=function(I,F,p,P,V,U){{U=84;while(U!=59)U==42?U=P?68:27:U==25?(this.T.P(F,this,I),this.Mh=I?this.Mh|F:this.Mh&~F,U=59):U==27?(this.setActive(false),kw(32,5,0,this,false,2)&&this.P(false,2),U=68):U==4?U=V&&typeof V.isEnabled=="function"&&!V.isEnabled()||!kw(32,8,0,this,!P,1)?59:42:U==68?(this.isVisible()&&this.T.JF(this,P),this.P(!P,1,true),U=59):U==84?U=p||F!=1?31:89:U==31?U=Z7(F,13,this)&&I!=RD(this,F,25,2)?25:59:U==89&&(P=!I,V=this.getParent(),U=4)}},"function"))throw Error("Invalid component class "+MA);while(typeof r8!=="function"){throw Error("Invalid renderer class "+r8);if(Number(void false)!==NaN)break}var mZ=Hw(6,3,MA),g8={passive:true,capture:(AF(43,6,function(){return new D5(null)},(OM(7,2,(((US(l7,(OM(7,2,18,(AF(43,(dD[mZ]=r8,3),function(){return new MA(null)},"goog-control"),l7),Nk),74)),l7.prototype.P=function(I,F,p,P,V){{V=24;while(V!=59)V==85?(P.disabled=p,V=59):V==24?(l7.D.P.call(this,I,F,p),P=F.o(),V=77):V==77&&(V=P&&I==1?85:59)}},l7).prototype.JF=function(){},l7.prototype).PD=function(){},21),D5,MA),D5.prototype.V=function(){delete (delete (D5.D.V.call(this),this).dm,this).Ui},"goog-button")),true)},oD=R.requestIdleCallback?function(I){requestIdleCallback(function(){I()},{timeout:4})}:R.setImmediate?function(I){setImmediate(I)}:function(I){setTimeout(I,0)},Sh,RT=String.fromCharCode(105,110,116,101,103,67,104,101,99,107,66,121,112,97,115,115),K_=[],LG=[],aT=(r.prototype.IA=(r.prototype.tc=void 0,false),[]),yx=[],WX=[],L_=(r.prototype.kX=void 0,r.prototype.Sy="toString",[]),h1=[],kZ={},vX=[],CG=(((((Py,function(){})(n_),function(){})(Vy),Fx,function(){})(I2),function(){})(oT),kZ).constructor,qA=void 0;if(t=(r.prototype.A="create",r).prototype,"C")t.c$=function(){return kw.call(this,32,26)};var d8=(((((((t.L=(window.performance||{}).now?function(){return this.u2+window.performance.now()}:function(){return+new Date},t).tF=(t.Sa=function(I,F,p,P,V,U,w,m,L){return KG.call(this,8,I,F,p,P,V,U,w,m,L)},t.Jc=function(I,F,p,P,V,U,w,m,L){return Z7.call(this,I,5,F,p,P,V,U,w,m,L)},function(I,F,p,P,V,U){return b.call(this,I,3,F,p,P,V,U)}),t.RA=function(){return C.call(this,20)},(t.Fh=function(I,F,p,P,V){return fG.call(this,5,2,15,F,I,p,P,V)},t).NI=0,t=r.prototype,t).l=function(I,F){return I=(qA=(F={},function(){return F==I?15:-29}),{}),function(p,P,V,U,w,m,L,y,v,X,g,x,a,f,A,c,Z,B,d,H,vw,z,q,k,Vj,u,M,N,ID,xw,l,cw,h,ES,J,wD,zk,vy,rD,xv,E){E=(J=67,wD=undefined,6);{xv=false;while(!null)try{if(J==82)break;else if(J==42)X++,J=32;else if(J==45)J=wD!==undefined?51:44;else if(J==32)J=X<q.length?48:93;else if(J==55)ix(104,this,G(v.length,2).concat(v),166),J=91;else if(J==12)J=k>255?95:30;else{if(J==77)return rD;if(J==99)E=61,xw=atob(vw),L=cw=0,V=[],J=33;else if(J==48)g=q[X][this.Sy](16),g.length==1&&(g="0"+g),H+=g,J=42;else if(J==80)p[1].push(W(270,this)[0],W(188,this).length,T(484,this).length,T(113,this).length,T(104,this).length,W(280,this).length,W(469,this).length,T(440,this).length),K(504,this,p[2]),this.g[272]&&OS(0,10001,this,22,T(272,this)),J=51;else if(J==89)E=26,bx(229,22,this,10001),J=51;else if(J==88)J=U.done?98:27;else if(J==65)J=88;else if(J==76)J=Vj==aT?40:4;else if(J==27)y=U.value,J=20;else if(J==43)k=xw.charCodeAt(L),J=12;else if(J==25)J=H?14:38;else if(J==4)J=Vj==yx?97:2;else if(J==71)J=Vj==vX?79:76;else if(J==79)B=p[2],N=G((ID=Y(104,this).length,-2*~ID+(ID^2)+2*(~ID|2)),2),w=this.X,this.X=this,J=73;else if(J==59)J=Vj==WX?84:26;else if(J==67)m=F,F=I,J=50;else if(J==51)E=6,F=m,J=87;else if(J==95)V[cw++]=255+(~k^255)-(~k|255),k>>=8,J=30;else if(J==36)J=L<xw.length?43:9;else if(J==53)E=26,J=64;else if(J==40)OS(0,p[2],this,22,p[1]),J=51;else{if(J==74)return rD;if(J==64)U=x.next(),J=88;else if(J==38)H="",X=0,J=7;else if(J==86)J=v.length>4?21:91;else if(J==9)this.qh=V,this.R=this.qh.length<<3,n(413,this,[0,0,0]),J=89;else if(J==97)rD=OS(0,10001,this,22,p[1]),wD=74,J=51;else if(J==2)J=Vj==h1?31:51;else if(J==62)v=v.slice(0,1E6),ix(104,this,[],197),lx(104,[],this,36),J=55;else if(J==91)E=26,this.X=w,J=45;else if(J==93)A=H,Y(270,this)[0]=B.shift(),W(188,this).length=B.shift(),T(484,this).length=B.shift(),Y(113,this).length=B.shift(),W(104,this).length=B.shift(),Y(280,this).length=B.shift(),T(469,this).length=B.shift(),T(440,this).length=B.shift(),rD=A,wD=77,J=51;else if(J==52)E=26,eG(ES,this,469,17),wD=82,J=51;else if(J==57)L++,J=36;else if(J==84)vw=p[1],J=99;else if(J==30)V[cw++]=k,J=57;else if(J==20)E=93,y(),J=64;else if(J==31){if(M=Y(241,this),Z=typeof Symbol!="undefined"&&Symbol.iterator&&M[Symbol.iterator])u=Z.call(M);else if(typeof M.length=="number")u={next:fG(5,2,3,M,0)};else throw Error(String(M)+" is not an iterable or ArrayLike");J=(U=(x=u,x.next()),65)}else if(J==44)E=26,q=n_(2).concat(T(104,this)),q[1]=(f=q[0],-(f&60)-1- -61+(f&-61)),q[3]=q[1]^N[0],q[4]=(c=q[1],P=N[1],-(c|0)-(P|0)+2*(c|P)),H=this.zO(q),J=25;else if(J==21)J=v.length>1E6?62:55;else if(J==26)J=Vj==L_?80:71;else if(J==73)E=34,a=T(339,this),a.length>0&&lx(104,G(a.length,2).concat(a),this,48),lx(104,G(this.H+1>>1,1),this,87),ix(104,this,G(this[vX].length,1)),z=this.wl?W(440,this):Y(469,this),z.length>0&&lx(188,G(z.length,2).concat(z),this,64),d=Y(188,this),d.length>4&&lx(104,G(d.length,2).concat(d),this,65),l=0,v=W(484,this),l+=Y(79,this)&2047,l-=(h=W(104,this).length,(h|5)-(h&5)-2*~h+2*(~h|5)),v.length>4&&(l-=(v.length|0)+3),l>0&&ix(104,this,G(l,2).concat(n_(l)),53),J=86;else if(J==98)M.length=0,J=51;else if(J==7)J=32;else if(J==50)E=26,Vj=p[0],J=59;else if(J==14)H="*"+H,J=93;else if(J==33)J=36;else if(J==87)wD!==undefined?(J=wD,wD=undefined):J=82;else if(J==23)throw zk;}}}catch(IT){if(zk=IT,E==6)throw IT;E==26?(wD=23,J=51):E==34?(wD=23,J=91):E==61?(ES=IT,J=52):E==93&&(vy=IT,J=53)}}}}(),t).Zb=0,t.ea=0,t).kn=function(){return KG.call(this,16)},t).mN=function(){return pG.call(this,3)},t).zO=function(I,F,p,P,V){return Z7.call(this,I,17,F,p,P,V)},/./),sS,Ln=WX.pop.bind((r.prototype[K_]=[0,0,1,1,0,1,1],r.prototype)[L_]),Qx=function(I,F){while({}){return(F=e(3,"error",null,"ks"))&&I.eval(F.createScript("1"))===1?function(p){return F.createScript(p)}:function(p){return""+p};if(![]==false)break}}(((sS=kw(32,17,{get:Ln},(d8[r.prototype.Sy]=Ln,r).prototype.A),r.prototype).TO=void 0,R));((Sh=R.knitsail||(R.knitsail={}),Sh.m)>40||(Sh.m=41,Sh.ks=Gk,Sh.a=Yw),Sh).HJI_=function(I,F,p,P,V,U,w,m,L){return L=new r(P,F,U,w,I,m,V),[function(y){return Hw(6,27,false,L,y)},function(y){L.kn(y)}]};}).call(this);'].join('\n')));}).call(this);






    (function(){var r='1';var ce=30;var sctm=false;var p='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\x3d';var g='knitsail';var eid='hNP1aIPIDZeqxc8P3p6-8QM';var ss_cgi=false;var sp='';var hashed_query='';var cbs='';var ussv='';var content_bindings=[];var challenge_version=0;var bgas=false;(function(){var t=typeof Object.defineProperties=="function"?Object.defineProperty:function(a,b,f){if(a==Array.prototype||a==Object.prototype)return a;a[b]=f.value;return a},u=function(a){a=["object"==typeof globalThis&&globalThis,a,"object"==typeof window&&window,"object"==typeof self&&self,"object"==typeof global&&global];for(var b=0;b<a.length;++b){var f=a[b];if(f&&f.Math==Math)return f}throw Error("a");},w=u(this),x=function(a,b){if(b)a:{var f=w;a=a.split(".");for(var h=0;h<a.length-1;h++){var e=a[h];if(!(e in
f))break a;f=f[e]}a=a[a.length-1];h=f[a];b=b(h);b!=h&&b!=null&&t(f,a,{configurable:!0,writable:!0,value:b})}},aa=function(a){var b=0;return function(){return b<a.length?{done:!1,value:a[b++]}:{done:!0}}},y=function(a){var b=typeof Symbol!="undefined"&&Symbol.iterator&&a[Symbol.iterator];if(b)return b.call(a);if(typeof a.length=="number")return{next:aa(a)};throw Error("b`"+String(a));};x("Promise",function(a){function b(){this.i=null}function f(c){return c instanceof e?c:new e(function(d){d(c)})}if(a)return a;b.prototype.j=function(c){if(this.i==null){this.i=[];var d=this;this.l(function(){d.v()})}this.i.push(c)};var h=w.setTimeout;b.prototype.l=function(c){h(c,0)};b.prototype.v=function(){for(;this.i&&this.i.length;){var c=this.i;this.i=[];for(var d=0;d<c.length;++d){var k=c[d];c[d]=null;try{k()}catch(l){this.A(l)}}}this.i=null};b.prototype.A=function(c){this.l(function(){throw c;})};var e=function(c){this.j=0;this.l=void 0;this.i=[];this.D=!1;var d=this.A();try{c(d.resolve,d.reject)}catch(k){d.reject(k)}};e.prototype.A=function(){function c(l){return function(m){k||(k=!0,l.call(d,m))}}var d=this,k=!1;return{resolve:c(this.J),reject:c(this.v)}};e.prototype.J=function(c){if(c===this)this.v(new TypeError("A Promise cannot resolve to itself"));else if(c instanceof e)this.L(c);else{a:switch(typeof c){case "object":var d=c!=null;break a;case "function":d=!0;break a;default:d=!1}d?this.I(c):this.C(c)}};e.prototype.I=function(c){var d=void 0;try{d=c.then}catch(k){this.v(k);return}typeof d=="function"?this.M(d,c):this.C(c)};e.prototype.v=function(c){this.F(2,c)};e.prototype.C=function(c){this.F(1,c)};e.prototype.F=function(c,d){if(this.j!=0)throw Error("c`"+c+"`"+d+"`"+this.j);this.j=c;this.l=d;this.j===2&&this.K();this.G()};e.prototype.K=function(){var c=this;h(function(){if(c.H()){var d=w.console;typeof d!=="undefined"&&d.error(c.l)}},1)};e.prototype.H=function(){if(this.D)return!1;var c=w.CustomEvent,d=w.Event,k=w.dispatchEvent;if(typeof k==="undefined")return!0;typeof c==="function"?c=new c("unhandledrejection",{cancelable:!0}):typeof d==="function"?c=new d("unhandledrejection",{cancelable:!0}):(c=w.document.createEvent("CustomEvent"),c.initCustomEvent("unhandledrejection",!1,!0,c));c.promise=this;c.reason=this.l;return k(c)};e.prototype.G=function(){if(this.i!=null){for(var c=0;c<this.i.length;++c)n.j(this.i[c]);this.i=null}};var n=new b;e.prototype.L=function(c){var d=this.A();c.B(d.resolve,d.reject)};e.prototype.M=function(c,d){var k=this.A();try{c.call(d,k.resolve,k.reject)}catch(l){k.reject(l)}};e.prototype.then=function(c,d){function k(q,v){return typeof q=="function"?function(A){try{l(q(A))}catch(B){m(B)}}:v}var l,m,C=new e(function(q,v){l=q;m=v});this.B(k(c,l),k(d,m));return C};e.prototype.catch=function(c){return this.then(void 0,c)};e.prototype.B=function(c,d){function k(){switch(l.j){case 1:c(l.l);break;case 2:d(l.l);break;default:throw Error("d`"+l.j);}}var l=
this;this.i==null?n.j(k):this.i.push(k);this.D=!0};e.resolve=f;e.reject=function(c){return new e(function(d,k){k(c)})};e.race=function(c){return new e(function(d,k){for(var l=y(c),m=l.next();!m.done;m=l.next())f(m.value).B(d,k)})};e.all=function(c){var d=y(c),k=d.next();return k.done?f([]):new e(function(l,m){function C(A){return function(B){q[A]=B;v--;v==0&&l(q)}}var q=[],v=0;do q.push(void 0),v++,f(k.value).B(C(q.length-1),m),k=d.next();while(!k.done)})};return e});
var z=this||self;function D(){var a,b;return(a=window.performance)==null?void 0:(b=a.getEntriesByType)==null?void 0:b.call(a,"navigation")[0]};function E(){var a;return(a=D())==null?void 0:a.type}function F(){var a,b;return(a=window.performance)==null?void 0:(b=a.navigation)==null?void 0:b.type};function G(a,b){google.c.e("load",a,String(b))};var ba=window.location;function H(a){return(a=ba.search.match(new RegExp("[?&]"+a+"=(\\d+)")))?Number(a[1]):-1}
function I(){var a=google.timers.load,b=a.e,f=google.stvsc;f&&(b.ssr=1);if(f)f=f.isBF;else{var h;f=((h=window.google)==null?0:h.rdn)?E()==="back_forward":F()===2}f&&(b.bb=1);var e;(((e=window.google)==null?0:e.rdn)?E()==="reload":F()===1)&&(b.r=1);if(h=D())(e=h.type)&&(b.nt=e),e=h.deliveryType,e!=null&&(b.dt=e),e=h.transferSize,e!=null&&(b.ts=e),h=h.nextHopProtocol,h!=null&&(b.nhp=h);(h=window.navigation)&&(h=h.activation)&&(h=h.navigationType)&&(b.ant=h);b=a.m;if(!b||!b.prs){h=window._csc==="agsa"&&
window._cshid;b=H("qsubts");var n;((n=window.google)==null?0:n.rdn)?(n=E(),n=!n||n==="navigate"):n=!F();h=n&&!h?a.qsubts||b:0;e="r";h>0&&(n=a.fbts||H("fbts"),n>0&&(a.t.start=Math.max(h,n),e=a.fbts===n?"i":"u"));f=a.t;var c=f.start;n={};a.wsrt!==void 0&&(n.wsrt=a.wsrt);if(c)for(var d in f)if(d!=="start"){var k=f[d];n[d]=d==="sgl"?k:d==="prs"?c-k:Math.max(k-c,0)}h>0&&(n.gsasrt=a.t.start-h,d=H("qsd"),d>0&&G("qsd",d),G("ests",(a.qsubts===h?"i":"u")+e),a.qsubts&&a.qsubts!==b&&G("qd",a.qsubts-b));d=a.e;a="/gen_204?s="+google.sn+"&t=sg&atyp=csi&ei="+google.kEI+"&rt=";b="";for(m in n)a+=""+b+m+"."+n[m],b=",";for(var l in d)a+="&"+l+"="+d[l];var m="";z._cshid&&(m+="&cshid="+z._cshid);(l=window.google&&window.google.kOPI||null)&&(m+="&opi="+l);m=a+=m;typeof navigator.sendBeacon==="function"?navigator.sendBeacon(m,""):google.log("","",m)}};var J=function(){var a=location.href;this.i=this.j="";var b=a.indexOf("#");b>0&&(this.j=a.substring(b),a=a.substring(0,b));b=a.indexOf("?");b>0&&(this.i="&"+a.substring(b+1),a=a.substring(0,b));this.l=a},L=function(a,b,f){K(a,b);a.i=a.i+"&"+b+"="+f},K=function(a,b){a.i=a.i.replace(new RegExp("&"+b+"=([^&]+)","g"),"")};J.prototype.toString=function(){return""+this.l+(this.i?"?"+this.i.substring(1):"")+this.j};
var M=function(a){this.i=a};M.prototype.toString=function(){return this.i};var N=function(a){this.N=a};function O(a){return new N(function(b){return b.substr(0,a.length+1).toLowerCase()===a+":"})}var ca=[O("data"),O("http"),O("https"),O("mailto"),O("ftp"),new N(function(a){return/^[^:]*([/?#]|$)/.test(a)})],da=/^\s*(?!javascript:)(?:[\w+.-]+:|[^:/?#]*(?:[/?#]|$))/i;function ea(){var a=z[g];if(a){a=y((0,a.a)(p,function(){},!1)).next().value;var b=[P()];return a(b)}Q(Error("f"))}function fa(a,b){var f=z[g];if(f){b=f.a;var h=[P()];b(p,function(e){return void e(a,h)},!1,void 0,void 0,void 0,void 0,!0)}else b(Error("f"))}function P(){var a={};content_bindings.forEach(function(b){a[b.key]=b.value});return a}function R(a){var b=challenge_version,f=cbs;return b>0?"B."+b+"."+f+"."+a:a}
function S(a){var b=new Date;b.setSeconds(b.getSeconds()+(Number(ce)||300));var f="SG_SS="+a,h=document.cookie.length+f.length;r&&(h<4093&&!ss_cgi&&(document.cookie=f+("; expires="+b.toUTCString())),T(),ss_cgi||document.cookie.indexOf("SG_SS=")<0?U(a):V(W()))}
function T(){var a;a:{if(window.st&&(a=window.st(location.href)))break a;a=performance&&performance.timing&&performance.timing.navigationStart?performance.timing.navigationStart:void 0}if(a)try{var b;((b=window)==null?0:b.sessionStorage)&&window.sessionStorage.setItem(eid,String(a))}catch(f){}}function W(){var a=eid,b=new J;K(b,"sg_ss");L(b,"sei",a);return b.toString()}function U(a){var b=eid,f=new J;L(f,"sg_ss",encodeURIComponent(a));L(f,"sei",b);V(f.toString())}
function ha(a){if(window.prs){X("psrt");sctm&&I();var b=W();window.prs(b,a).catch(function(){U(a)})}else U(a)}function V(a){X("psrt");sctm&&I();window.prs?window.prs(a).catch(function(){Y(a)}):Y(a)}
function Y(a){if(window.pr)window.pr(a);else{a:{var b=b===void 0?ca:b;if(a instanceof M)b=a;else{for(var f=0;f<b.length;++f){var h=b[f];if(h instanceof N&&h.N(a)){b=new M(a);break a}}b=void 0}}a=location;if(b instanceof M)if(b instanceof M)b=b.i;else throw Error("e");else b=da.test(b)?b:void 0;b!==void 0&&a.replace(b)}}function Q(a){navigator.sendBeacon("/gen_204?cad=sg_b_e&e="+a,"")}
function ia(){X("bsst");if(bgas)fa(function(b){X("bset");S(R(b))},function(b){Q(b);X("bset")});else{var a=ea();X("bset");a&&S(R(a))}}function X(a){sctm&&google.tick("load",a)};navigator||(z.navigator={});typeof navigator.sendBeacon!=="function"&&(navigator.sendBeacon=function(a){(new Image).src=a});window.onerror=function(a,b,f,h,e){navigator.sendBeacon("/gen_204?emsg="+(e instanceof Error?e.message:a)+"&srcpg=sgs&jsr=1&jsel=3")};X("sst");var Z;window.sgs&&ussv?(X("ssst"),Z=window.sgs(sp).then(function(a){X("sset");r&&(T(),ha(a));return!0},function(){return!1})):Z=Promise.resolve(!1);Z.then(function(a){a||ia()}).catch(function(a){Q(a)});}).call(this);})();














