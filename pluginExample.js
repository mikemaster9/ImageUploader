/**
 * jQuery Plugin Template
 * 一个标准的jQuery插件模板，实现了基本的输入控件功能
 * 
 * @author Your Name
 * @version 1.0.0
 * @license MIT
 */

;(function($) {
    'use strict';
    
    /**
     * 插件基本配置
     * @constant
     */
    const PLUGIN_NAME = 'myPlugin';          // 插件名称
    const NAMESPACE = 'myPlugin';            // 命名空间，用于事件和数据存储
    const VERSION = '1.0.0';                 // 插件版本号
    
    /**
     * CSS类名定义
     * 使用BEM命名规范：block__element--modifier
     * @constant
     */
    const CLASS_PREFIX = 'my-plugin';
    const CLASSES = {
        CONTAINER: `${CLASS_PREFIX}__container`,  // 容器类名
        INPUT: `${CLASS_PREFIX}__input`,         // 输入框类名
        DISABLED: `${CLASS_PREFIX}--disabled`,    // 禁用状态类名
        FOCUSED: `${CLASS_PREFIX}--focused`       // 聚焦状态类名
    };
    
    /**
     * 事件名称定义
     * 所有事件都使用命名空间
     * @constant
     */
    const EVENTS = {
        CHANGE: `change.${NAMESPACE}`,    // 值改变事件
        FOCUS: `focus.${NAMESPACE}`,      // 获得焦点事件
        BLUR: `blur.${NAMESPACE}`,        // 失去焦点事件
        INIT: `init.${NAMESPACE}`,        // 初始化完成事件
        DESTROY: `destroy.${NAMESPACE}`    // 销毁事件
    };
    
    /**
     * 可用方法列表
     * 定义插件支持的公共方法
     * @constant
     * @type {Array<string>}
     */
    const METHODS = ['getValue', 'setValue', 'enable', 'disable', 'destroy'];
    
    /**
     * 默认配置项
     * @constant
     * @type {Object}
     */
    const DEFAULTS = {
        /** @type {number} 控件宽度 */
        width: 200,
        /** @type {number} 控件高度 */
        height: 100,
        /** @type {boolean} 是否启用 */
        enable: true,
        /** @type {string} 主题名称 */
        theme: 'default',
        /** @type {Function|null} 值改变时的回调函数 */
        onChange: null
    };

    /**
     * 插件主类
     * @class
     */
    class Plugin {
        /**
         * 创建插件实例
         * @constructor
         * @param {HTMLElement} element - 目标元素
         * @param {Object} options - 配置选项
         */
        constructor(element, options) {
            /**
             * jQuery包装的目标元素
             * @type {jQuery}
             * @private
             */
            this.$element = $(element);
            
            /**
             * 合并后的配置选项
             * @type {Object}
             * @private
             */
            this.options = $.extend({}, DEFAULTS, options);
            
            /**
             * 当前值
             * @type {string}
             * @private
             */
            this.value = '';
            
            /**
             * 是否启用状态
             * @type {boolean}
             * @private
             */
            this.enabled = this.options.enable;
            
            // 初始化插件
            this._init();
        }

        /**
         * 初始化插件
         * @private
         */
        _init() {
            this._injectStyles();
            this._createElements();
            this._bindEvents();
            this._setState();
            this.$element.trigger(EVENTS.INIT);
        }

        /**
         * 注入插件样式
         * 如果样式已存在则跳过
         * @private
         */
        _injectStyles() {
            if ($(`#${PLUGIN_NAME}-styles`).length) return;

            const styles = `
                .${CLASSES.CONTAINER} {
                    position: relative;
                    display: inline-block;
                }
                .${CLASSES.INPUT} {
                    width: 100%;
                    height: 32px;
                    padding: 4px 8px;
                    border: 1px solid #d9d9d9;
                    border-radius: 4px;
                    transition: all 0.3s;
                }
                .${CLASSES.INPUT}:focus {
                    border-color: #40a9ff;
                    outline: none;
                    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
                }
                .${CLASSES.DISABLED} {
                    background-color: #f5f5f5;
                    cursor: not-allowed;
                }
            `;

            $('<style>')
                .attr('id', `${PLUGIN_NAME}-styles`)
                .text(styles)
                .appendTo('head');
        }

        /**
         * 创建DOM结构
         * @private
         */
        _createElements() {
            this.$container = $('<div>').addClass(CLASSES.CONTAINER);
            this.$input = $('<input>')
                .addClass(CLASSES.INPUT)
                .attr('type', 'text');

            // 包装原始元素并插入新创建的输入框
            this.$element.wrap(this.$container);
            this.$element.before(this.$input);
            this.$element.hide();
        }

        /**
         * 绑定事件处理器
         * @private
         */
        _bindEvents() {
            this.$input
                .on('input', (e) => {
                    this.value = e.target.value;
                    this._triggerChange();
                })
                .on('focus', () => {
                    this.$container.addClass(CLASSES.FOCUSED);
                    this.$element.trigger(EVENTS.FOCUS);
                })
                .on('blur', () => {
                    this.$container.removeClass(CLASSES.FOCUSED);
                    this.$element.trigger(EVENTS.BLUR);
                });
        }

        /**
         * 设置控件状态
         * @private
         */
        _setState() {
            if (this.enabled) {
                this.$input
                    .prop('disabled', false)
                    .removeClass(CLASSES.DISABLED);
            } else {
                this.$input
                    .prop('disabled', true)
                    .addClass(CLASSES.DISABLED);
            }
        }

        /**
         * 触发change事件
         * @private
         */
        _triggerChange() {
            if (typeof this.options.onChange === 'function') {
                this.options.onChange.call(this, this.value);
            }
            this.$element.trigger(EVENTS.CHANGE, [this.value]);
        }

        // 公共方法

        /**
         * 获取当前值
         * @public
         * @returns {string} 当前值
         */
        getValue() {
            return this.value;
        }

        /**
         * 设置新值
         * @public
         * @param {string} value - 要设置的新值
         */
        setValue(value) {
            this.value = value;
            this.$input.val(value);
            this._triggerChange();
        }

        /**
         * 启用控件
         * @public
         */
        enable() {
            this.enabled = true;
            this._setState();
        }

        /**
         * 禁用控件
         * @public
         */
        disable() {
            this.enabled = false;
            this._setState();
        }

        /**
         * 销毁插件
         * 清理所有事件监听和DOM修改
         * @public
         */
        destroy() {
            this.$input.off();
            this.$element
                .unwrap()
                .removeData(NAMESPACE)
                .show();
            this.$input.remove();
            this.$element.trigger(EVENTS.DESTROY);
        }
    }

    /**
     * jQuery插件定义
     * 支持方法调用和初始化
     * @param {string|Object} option - 方法名或配置对象
     * @param {...*} args - 方法参数
     * @returns {jQuery|*} - jQuery对象或方法返回值
     */
    $.fn[PLUGIN_NAME] = function(option, ...args) {
        let returnValue = this;

        this.each(function() {
            const $this = $(this);
            let instance = $this.data(NAMESPACE);
            const options = typeof option === 'object' && option;

            // 如果实例不存在且调用的是destroy方法，直接返回
            if (!instance && option === 'destroy') return;

            // 如果实例不存在，创建新实例
            if (!instance) {
                instance = new Plugin(this, options);
                $this.data(NAMESPACE, instance);
                return;
            }

            // 方法调用
            if (typeof option === 'string') {
                if (!METHODS.includes(option)) {
                    throw new Error(`${PLUGIN_NAME}: Unknown method "${option}"`);
                }

                try {
                    returnValue = instance[option].apply(instance, args);
                } catch (error) {
                    console.error(`${PLUGIN_NAME}: Error executing method "${option}"`, error);
                    throw error;
                }
            }
        });

        return returnValue;
    };

    // 暴露版本号和默认配置
    $.fn[PLUGIN_NAME].version = VERSION;
    $.fn[PLUGIN_NAME].defaults = DEFAULTS;

})(jQuery);

/**
 * 使用示例：
 * 
 * // 初始化
 * $('#element').myPlugin({
 *     width: 300,
 *     onChange: function(value) {
 *         console.log('Value changed:', value);
 *     }
 * });
 * 
 * // 调用方法
 * $('#element').myPlugin('setValue', 'new value');
 * 
 * // 获取值
 * const value = $('#element').myPlugin('getValue');
 * 
 * // 禁用
 * $('#element').myPlugin('disable');
 * 
 * // 启用
 * $('#element').myPlugin('enable');
 * 
 * // 销毁
 * $('#element').myPlugin('destroy');
 * 
 * // 监听事件
 * $('#element').on('myPlugin:change', function(e, value) {
 *     console.log('Value changed through event:', value);
 * });
 */
