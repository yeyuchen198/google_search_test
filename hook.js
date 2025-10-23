
(() => {
      // ----- 安全引用，防止网页污染 -----
      const _Reflect_getProto = typeof Reflect !== "undefined" && typeof Reflect.getPrototypeOf === "function"
        ? Reflect.getPrototypeOf
        : (obj) => obj.__proto__;
      const _Object_getOwnNames = Object.getOwnPropertyNames.bind(Object);
      const _Object_getOwnDesc = Object.getOwnPropertyDescriptor.bind(Object);
      const _Object_defineProp = Object.defineProperty.bind(Object);
      const _Console_log = console.log.bind(console);
      const _Console_error = console.error.bind(console);
      const _Date_nowISO = () => new Date().toISOString();

      // 日志容器
      const _globalLogs = [];
      window._hookLogs = _globalLogs;
      window.dumpHookLogs = () => console.log(JSON.stringify(_globalLogs, null, 2));

      // 这些全局名字千万别去替换（黑名单）
      const GLOBAL_NAMES_TO_SKIP = new Set([
        "Object", "Function", "Array", "Date", "RegExp", "Promise", "Map", "Set", "WeakMap", "WeakSet",
        "Reflect", "JSON", "Math", "Intl", "console", "window", "document", "globalThis",
        "Error", "TypeError"
      ]);

      function isLikelyGlobalConstructor(val) {
        if (typeof val !== "function") return false;
        // 常见内建构造器都有 prototype（大多都），且 prototype.constructor 指向自己
        try {
          const proto = _Reflect_getProto(val.prototype || {});
          return !!(val.prototype && val.prototype.constructor === val && proto !== null);
        } catch {
          return false;
        }
      }

      function isNative(fn) {
        return (/\{\s*\[native code\]\s*\}/).test(String(fn));
      }

      function hookObject(objName, options = {}) {
        const cfg = Object.assign({ deep: true, includeOwn: true, filter: null }, options);

        try {
          const target = eval(objName);
          if (!target) {
            _Console_log(`[Hook] ❌ ${objName} is undefined`);
            return;
          }

          const logs = _globalLogs;
          const visited = new WeakSet();

          function hookLevel(obj, level = 0) {
            if (!obj || visited.has(obj)) return;
            visited.add(obj);

            // 如果当前对象是 plain {}（即 constructor.name === 'Object' 且原型正是 Object.prototype），
            // 说明已经到达普通对象层，继续递归可能会影响全局命名空间 -> 可视需要跳过
            try {
              if (obj.constructor?.name === "Object" && _Reflect_getProto(obj) === Object.prototype) {
                // 不自动返回 —— 某些场景你仍想 hook plain object，可改这里策略
                // return;
              }
            } catch (e) { /* ignore */ }

            const proto = _Reflect_getProto(obj);
            const names = new Set();

            if (cfg.includeOwn) {
              try { _Object_getOwnNames(obj).forEach(n => names.add(n)); } catch {}
            }
            if (proto) {
              try { _Object_getOwnNames(proto).forEach(n => names.add(n)); } catch {}
            }

            for (const key of names) {
                // _Console_log(`${objName}.${key}`);
              // 跳过 constructor
              if (key === "constructor") continue;

              // 跳过显式黑名单（比如 window.Object）
              if (GLOBAL_NAMES_TO_SKIP.has(key)) continue;

              // 进一步过滤：如果 key 是全局命名空间下的构造器（例如 window.Object），跳过
              let desc;
              try {
                desc = _Object_getOwnDesc(obj, key) || _Object_getOwnDesc(proto || {}, key);
              } catch {
                continue;
              }
              if (!desc) continue;

              // 获取原始值（注意访问可能抛错）
              let val;
              try { val = obj[key]; } catch { continue; }

              // 允许用户通过 filter 控制要不要 hook（支持 RegExp、函数或 null）
              if (cfg.filter) {
                if (cfg.filter instanceof RegExp) {
                  if (!cfg.filter.test(key)) continue;
                } else if (typeof cfg.filter === "function") {
                  try { if (!cfg.filter({ obj, key, val, desc, objName })) continue; } catch { continue; }
                }
              }

              // 如果这是一个全局构造函数（Object / Function / Array / ...），不要替换它
              if (isLikelyGlobalConstructor(val) || (typeof val === "function" && val === window[key])) {
                // 跳过替换构造器本身
                continue;
              }

              // Hook 方法
              if (typeof val === "function") {
                // _Console_log(`${objName}.${key} is a function`);
                try {
                  const original = val;
                  // 保存原函数到日志里（可选）
                  // 用 defineProperty 覆盖时，确保不破坏 descriptor 的 writable/enumerable 等
                  _Object_defineProp(obj, key, {
                    value: function (...args) {
                      try {
                        const result = original.apply(this, args);
                        const msg = `[Hook] ${objName}.${key}(${args.map(a => {
                          try { return JSON.stringify(a); } catch { return String(a); }
                        }).join(", ")}) -> ${String(result)}`;
                        logs.push({ time: _Date_nowISO(), obj: objName, key, msg });
                        _Console_log(msg);
                        return result;
                      } catch (err) {
                        _Console_error(`[Hook][Error] ${objName}.${key}:`, err);
                        throw err;
                      }
                    },
                    configurable: true,
                    enumerable: desc.enumerable === true,
                    writable: desc.writable !== false
                  });

                  // 伪装方法名称
                  // _Object_defineProp(eval(`${objName}.${key}`), 'name', { value: key });
                  _Object_defineProp(obj[key], 'name', { value: key });

                  // todo: 伪装 toString() 以及 toString.toString() 以及 prototype
                  // document.createElement.toString()
                  // function createElement() { [native code] }
                  // document.createElement.toString.toString()
                  // function toString() { [native code] }
                  const _isNative = isNative(val);
                  // _Console_log(`${objName}.${key} _isNative: ${_isNative}`);
                  if (_isNative) {
                    _Object_defineProp(obj[key], 'toString', {
                      value: function() {
                        return `function ${key || ''}() { [native code] }`;
                      },
                      writable: false,
                      configurable: false
                    });
                    _Object_defineProp(obj[key].toString, 'toString', {
                      value: function() {
                        return 'function toString() { [native code] }';
                      },
                      writable: false,
                      configurable: false
                    });
                    _Object_defineProp(obj[key], 'prototype', {
                      value: undefined,
                      writable: false,
                      configurable: false
                    });
                  }


                } catch (e) {
                  // 无权修改（比如许多内建属性不可配置），直接跳过
                  continue;
                }
              } else {
                // _Console_log(`${objName}.${key} is a attribute, desc: ${desc}`);
                // Hook 属性访问器或常量（尽量不去动不可配置的属性）
                try {
                  // 如果原始 descriptor 标明不可配置，跳过以避免抛出
                  if (!desc.configurable) continue;

                  _Object_defineProp(obj, key, {
                    get() {
                      const value = desc.get ? desc.get.call(this) : desc.value;
                      const msg = `[Hook][get] ${objName}.${key} -> ${String(value)}`;
                      logs.push({ time: _Date_nowISO(), obj: objName, key, msg });
                      _Console_log(msg);
                      return value;
                    },
                    set(v) {
                      const msg = `[Hook][set] ${objName}.${key} = ${String(v)}`;
                      logs.push({ time: _Date_nowISO(), obj: objName, key, msg });
                      _Console_log(msg);
                      if (desc.set) desc.set.call(this, v);
                    },
                    configurable: true,
                    enumerable: desc.enumerable === true
                  });
                } catch (e) {
                  // _Console_error(`[Hook] ❌ Failed to hook ${objName}.${key}:`, e);
                  continue;
                }
              }
            } // for names

            // 递归原型链
            if (cfg.deep) {
              try {
                const p = _Reflect_getProto(obj);
                if (p && p !== Object.prototype) hookLevel(p, level + 1);
              } catch { /* ignore */ }
            }
          } // hookLevel

          hookLevel(target);
          _Console_log(`[Hook] ✅ ${objName} hooked (deep=${cfg.deep}, includeOwn=${cfg.includeOwn})`);
        } catch (err) {
          _Console_error(`[Hook] ❌ Failed to hook ${objName}:`, err);
        }
      }

      window.hookObject = hookObject;
      _Console_log("[Hook] 🧩 Safe hookObject ready - will NOT replace global constructors");
    })();




    
    hookObject("window");
    hookObject("performance");
    hookObject("document");
    hookObject("location");
    hookObject("navigator");
    hookObject("screen");
    hookObject("history");
    hookObject("localStorage");
    hookObject("sessionStorage");



    