(function($) {
    'use strict';

    // 定义可被外部调用的方法列表
    const METHODS = ['getImageList', 'clear', 'destroy', 'loadImages', 'formatImageKeys'];

    class ImageUploader {
        constructor(container, options = {}) {
            this.$container = $(container);
            if (!this.$container.length) {
                throw new Error('Container element not found');
            }

            // 默认配置
            this.options = $.extend({
                maxSize: 5 * 1024 * 1024, // 5MB
                maxCount: 9, // 最大上传数量
                uploadUrl: '', // 上传接口地址
                enable: true, // 是否启用上传按钮
                accept: 'image/png,image/jpeg,image/jpg', // 默认支持的图片格式
                onChange: null, // 图片列表变化时的回调
                useViewer: false, // 是否使用 Viewer 查看图片
                viewerOptions: {}, // Viewer 的配置选项
                thumbnailWidth: 64, // 缩略图宽度
                thumbnailHeight: 64 // 缩略图高度
            }, options);

            this.selectedFiles = [];
            this.layerIndex = null;
            this.mainViewer = null;
            this.dialogViewer = null;
            
            this.init();
        }

        init() {
            this.injectStyles();
            this.initDOM();
            this.initEvents();
        }

        // 注入样式
        injectStyles() {
            if ($('#image-uploader-styles').length) return;

            const styles = `
                .iu-image-list-container { padding: 15px; display: flex; align-items: center; gap: 8px; }
                .iu-image-list-label { margin-right: 8px; color: #333; }
                .iu-image-list { display: flex; flex-wrap: wrap; gap: 8px; }
                .iu-image-item { width: ${this.options.thumbnailWidth}px; height: ${this.options.thumbnailHeight}px; border-radius: 4px; overflow: hidden; background-color: #f5f5f5; position: relative; }
                .iu-image-item img { width: 100%; height: 100%; object-fit: cover; cursor: pointer; }
                .iu-image-item .iu-delete-btn { position: absolute; right: 2px; top: 2px; width: 16px; height: 16px; background: rgba(0, 0, 0, 0.5); color: #fff; border-radius: 50%; text-align: center; line-height: 14px; cursor: pointer; font-size: 12px; display: none; }
                .iu-image-item:hover .iu-delete-btn { display: block; }
                .iu-add-button { width: ${this.options.thumbnailWidth}px; height: ${this.options.thumbnailHeight}px; border: 2px dashed #ddd; border-radius: 4px; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; position: relative; }
                .iu-add-button:hover { border-color: #1890ff; }
                .iu-add-button::before, .iu-add-button::after { content: ''; position: absolute; background-color: #999; }
                .iu-add-button::before { width: 20px; height: 2px; }
                .iu-add-button::after { width: 2px; height: 20px; }
                .iu-upload-area { width: 100%; height: 300px; border: 2px dashed #ddd; border-radius: 4px; background: #fff; transition: all 0.3s; position: relative; cursor: default; }
                .iu-upload-area:not(.iu-has-preview) { cursor: pointer; }
                .iu-upload-area:hover { border-color: #1890ff; }
                .iu-preview-container { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-wrap: wrap; align-content: flex-start; padding: 10px; gap: 10px; overflow-y: auto; }
                .iu-preview-item { width: ${this.options.thumbnailWidth}px; height: ${this.options.thumbnailHeight}px; position: relative; flex-shrink: 0; }
                .iu-preview-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; cursor: pointer; }
                .iu-preview-delete { position: absolute; right: 2px; top: 2px; width: 16px; height: 16px; background: rgba(0, 0, 0, 0.5); color: #fff; border-radius: 50%; text-align: center; line-height: 14px; cursor: pointer; font-size: 12px; display: none; }
                .iu-preview-item:hover .iu-preview-delete { display: block; }
                .iu-upload-placeholder { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; text-align: center; pointer-events: none; }
                .iu-upload-icon { font-size: 28px; color: #999; margin-bottom: 8px; }
                .iu-upload-text { color: #999; font-size: 14px; }
                .iu-has-preview .iu-upload-placeholder { display: none; }
                .iu-dialog-btn { padding: 5px 15px; border-radius: 4px; border: 1px solid #ddd; margin-left: 10px; cursor: pointer; }
                .iu-btn-cancel { background: #fff; }
                .iu-btn-confirm { background: #1890ff; color: #fff; border-color: #1890ff; }
                #iu-upload-dialog { padding: 20px; }
                .iu-dialog-footer { text-align: right; margin: 20px -20px -20px; padding: 10px 20px; border-top: 1px solid #e8e8e8; background: #fff; }
                .iu-count-info { color: #999; font-size: 12px; margin-left: 8px;}
                .iu-count-info.iu-count-full {color: #ff4d4f;}
            `;

            $('<style>')
                .attr('id', 'image-uploader-styles')
                .text(styles)
                .appendTo('head');
        }

        // 初始化DOM
        initDOM() {
            this.$container.empty();
            this.$container.addClass('iu-image-list-container');

            this.$container.html(`
                <span class="iu-image-list-label">图片：</span>
                <div class="iu-image-list" id="iu-image-list">
                    ${this.options.enable ? '<button type="button" class="iu-add-button" id="iu-upload-trigger"></button>' : ''}
                </div>
                <span class="iu-count-info">0/${this.options.maxCount}</span>
            `);

            // 创建上传弹窗
            if (!$('#iu-upload-dialog').length) {
                const dialogHTML = `
                    <div id="iu-upload-dialog" style="display: none;">
                        <div class="iu-upload-area" id="iu-upload-area">
                            <div class="iu-upload-placeholder">
                                <div class="iu-upload-icon">+</div>
                                <div class="iu-upload-text">支持拖拽或粘贴图片到此区域</div>
                            </div>
                            <div class="iu-preview-container" id="iu-preview-container"></div>
                        </div>
                        <div class="iu-dialog-footer">
                            <button class="iu-dialog-btn iu-btn-cancel">取消</button>
                            <button class="iu-dialog-btn iu-btn-confirm">确定</button>
                        </div>
                    </div>
                `;
                $(dialogHTML).appendTo('body');
            }

            // 创建隐藏的文件输入
            if (!$('#iu-file-input').length) {
                this.$fileInput = $('<input>', {
                    type: 'file',
                    id: 'iu-file-input',
                    multiple: true,
                    accept: this.options.accept,
                    style: 'display: none'
                }).appendTo('body');
            } else {
                this.$fileInput = $('#iu-file-input');
                this.$fileInput.attr('accept', this.options.accept);
            }

            if (this.options.useViewer) {
                this.initViewer();
            }
        }

        // 初始化 Viewer
        initViewer() {
            if (!this.options.useViewer) return;

            // 销毁现有的 Viewer 实例
            if (this.mainViewer) {
                this.mainViewer.destroy();
            }

            // 初始化主列表的 Viewer
            const defaultOptions = {
                navbar: false,
                toolbar: {
                    zoomIn: true,
                    zoomOut: true,
                    oneToOne: true,
                    reset: true,
                    prev: true,
                    next: true,
                    rotateLeft: true,
                    rotateRight: true,
                }
            };

            const viewerOptions = $.extend({}, defaultOptions, this.options.viewerOptions);
            
            // 为主列表创建 Viewer
            this.mainViewer = new Viewer(
                this.$container.find('.iu-image-list')[0],
                {
                    ...viewerOptions,
                    filter: (image) => {
                        return image.classList.contains('iu-image');
                    }
                }
            );
        }

        // 初始化弹窗的 Viewer
        initDialogViewer() {
            if (!this.options.useViewer) return;

            // 销毁现有的对话框 Viewer 实例
            if (this.dialogViewer) {
                this.dialogViewer.destroy();
            }

            // 为预览容器创建 Viewer
            this.dialogViewer = new Viewer(
                document.getElementById('iu-preview-container'),
                {
                    ...this.options.viewerOptions,
                    filter: (image) => {
                        return image.classList.contains('iu-preview-image');
                    },
                    toolbar: {
                        zoomIn: true,
                        zoomOut: true,
                        oneToOne: true,
                        reset: true,
                        prev: true,
                        next: true,
                        rotateLeft: true,
                        rotateRight: true,
                    },
                    title: false,
                    navbar: false,
                    zIndex: 99999999, 
                }
            );
        }

        // 初始化事件
        initEvents() {
            const self = this;

            // 点击上传按钮
            this.$container.on('click', '#iu-upload-trigger', () => {
                this.openUploadDialog();
            });

            // 文件选择变化
            this.$fileInput.on('change', function(e) {
                const files = Array.from(e.target.files);
                self.handleFiles(files);
                this.value = '';
            });

            // 上传区域点击
            $(document).on('click', '#iu-upload-area', (e) => {
                // 如果点击的是预览项或其子元素，不触发文件选择
                if ($(e.target).closest('.iu-preview-item').length) {
                    return;
                }
                this.$fileInput.click();
            });

            // 确认按钮
            $(document).on('click', '#iu-upload-dialog .iu-btn-confirm', () => {
                this.handleConfirm();
            });

            // 取消按钮
            $(document).on('click', '#iu-upload-dialog .iu-btn-cancel', () => {
                this.closeUploadDialog();
            });

            // 删除已上传图片
            this.$container.on('click', '.iu-delete-btn', (e) => {
                e.stopPropagation();
                $(e.target).closest('.iu-image-item').remove();
                this.updateCountInfo();
                this.triggerChange();
            });

            // 拖拽上传
            const $uploadArea = $('#iu-upload-area');
            $uploadArea.on('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                $uploadArea.css('borderColor', '#1890ff');
            });

            $uploadArea.on('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                $uploadArea.css('borderColor', '#ddd');
            });

            $uploadArea.on('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                $uploadArea.css('borderColor', '#ddd');
                const files = Array.from(e.originalEvent.dataTransfer.files)
                    .filter(file => file.type.startsWith('image/'));
                this.handleFiles(files);
            });

            // 粘贴上传
            $(document).on('paste', (e) => {
                const items = e.originalEvent.clipboardData?.items;
                if (items) {
                    const imageFiles = Array.from(items)
                        .filter(item => item.type.startsWith('image/'))
                        .map(item => item.getAsFile())
                        .filter(Boolean);
                    this.handleFiles(imageFiles);
                }
            });
        }

        // 打开上传弹窗
        openUploadDialog() {
            this.selectedFiles = [];
            this.layerIndex = layer.open({
                type: 1,
                title: '上传图片',
                area: ['520px', '460px'],
                scrollbar: false,
                content: $('#iu-upload-dialog'),
                success: () => {
                    $('#iu-preview-container').empty();
                    $('#iu-upload-area').removeClass('iu-has-preview');
                }
            });
        }

        // 关闭上传弹窗
        closeUploadDialog() {
            this.selectedFiles = [];
            layer.close(this.layerIndex);
        }

        // 更新计数信息
        updateCountInfo() {
            const currentCount = this.$container.find('.iu-image-item').length;
            const $countInfo = this.$container.find('.iu-count-info');
            const $uploadTrigger = this.$container.find('#iu-upload-trigger');
            
            $countInfo.text(`${currentCount}/${this.options.maxCount}`);
            
            if (currentCount >= this.options.maxCount) {
                $countInfo.addClass('iu-count-full');
                $uploadTrigger.hide();
            } else {
                $countInfo.removeClass('iu-count-full');
                $uploadTrigger.show();
            }
        }

        // 处理文件
        handleFiles(files) {
            const currentCount = this.$container.find('.iu-image-item').length;
            const remainingSlots = this.options.maxCount - currentCount;
            const dialogPreviewCount = $('#iu-preview-container .iu-preview-item').length;
            
            if (remainingSlots <= 0) {
                layer.msg(`已达到最大上传数量 ${this.options.maxCount} 张`);
                return;
            }

            // 计算还能上传多少张
            const availableSlots = remainingSlots - dialogPreviewCount;
            if (availableSlots <= 0) {
                layer.msg(`选择的图片数量超过限制`);
                return;
            }

            // 限制处理的文件数量
            const filesToProcess = Array.from(files).slice(0, availableSlots);

            filesToProcess.forEach(file => {
                if (file.type.startsWith('image/')) {
                    // 检查文件大小
                    if (file.size > this.options.maxSize) {
                        layer.msg(`文件 ${file.name} 超过最大限制 ${this.options.maxSize / 1024 / 1024}MB`);
                        return;
                    }

                    this.selectedFiles.push(file);
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const $previewItem = $('<div>', {
                            class: 'iu-preview-item',
                            html: `
                                <img src="${e.target.result}" alt="预览图片" class="iu-preview-image">
                                <div class="iu-preview-delete">×</div>
                            `
                        });

                        $previewItem.find('.iu-preview-delete').on('click', (e) => {
                            e.stopPropagation();
                            const index = this.selectedFiles.indexOf(file);
                            if (index > -1) {
                                this.selectedFiles.splice(index, 1);
                            }
                            $previewItem.remove();
                            if (this.selectedFiles.length === 0) {
                                $('#iu-upload-area').removeClass('iu-has-preview');
                            }
                        });

                        $('#iu-preview-container').append($previewItem);
                        $('#iu-upload-area').addClass('iu-has-preview');

                        // 重新初始化对话框的 Viewer
                        if (this.options.useViewer) {
                            this.initDialogViewer();
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // 处理确认上传
        async handleConfirm() {
            if (this.selectedFiles.length === 0) {
                layer.msg('请选择要上传的图片');
                return;
            }

            const loadingIndex = layer.load(1, {
                shade: [0.3, '#fff']
            });

            try {
                // 如果提供了上传URL，使用实际的上传
                if (this.options.uploadUrl) {
                    const formData = new FormData();
                    this.selectedFiles.forEach(file => {
                        formData.append('files[]', file);
                    });

                    const response = await fetch(this.options.uploadUrl, {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();
                    if (!result.success) {
                        throw new Error(result.message || '上传失败');
                    }

                    this.appendImages(result.data);
                } else {
                    // 使用模拟上传
                    const results = await Promise.all(
                        this.selectedFiles.map(file => this.mockUpload(file))
                    );
                    this.appendImages(results);
                }

                layer.close(this.layerIndex);
                layer.msg('上传成功');
            } catch (error) {
                console.error('上传失败:', error);
                layer.msg('上传失败，请重试');
            } finally {
                layer.close(loadingIndex);
                this.selectedFiles = [];
            }
        }

        // 模拟上传
        mockUpload(file) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    const key = 'img_' + Math.random().toString(36).substr(2, 9);
                    resolve({
                        key: key,
                        url: URL.createObjectURL(file)
                    });
                }, 500);
            });
        }

        // 追加图片到列表
        appendImages(images) {
            const currentCount = this.$container.find('.iu-image-item').length;
            const remainingSlots = this.options.maxCount - currentCount;
            
            // 限制添加的图片数量
            const imagesToAdd = images.slice(0, remainingSlots);
            
            const $uploadTrigger = $('#iu-upload-trigger');
            imagesToAdd.forEach(image => {
                const $imageItem = $('<div>', {
                    class: 'iu-image-item',
                    html: `
                        <img src="${image.url}" alt="上传图片" class="iu-image">
                        <div class="iu-delete-btn">×</div>
                        <input type="hidden" name="imageKeys[]" value="${image.key}">
                    `
                });
                $uploadTrigger.before($imageItem);
            });
            
            this.updateCountInfo();
            this.triggerChange();

            // 重新初始化 Viewer
            if (this.options.useViewer) {
                this.initViewer();
            }
        }

        // 加载图片方法
        loadImages(images = []) {
            if (!Array.isArray(images)) {
                console.error('loadImages parameter must be an array');
                return;
            }
        
            // 限制加载的图片数量
            const imagesToLoad = images.slice(0, this.options.maxCount);
        
            // 清空现有图片
            this.$container.find('.iu-image-item').remove();
        
            // 获取上传按钮元素（如果存在）
            const $uploadTrigger = this.$container.find('#iu-upload-trigger');
        
            // 添加图片
            imagesToLoad.forEach(image => {
                const imageUrl = typeof image === 'string' ? image : image.url;
                const imageKey = typeof image === 'string' ? image : (image.key || image.url);
        
                const $imageItem = $('<div>', {
                    class: 'iu-image-item',
                    html: `
                        <img src="${imageUrl}" alt="上传图片" class="iu-image">
                        <div class="iu-delete-btn">×</div>
                        <input type="hidden" name="imageKeys[]" value="${imageKey}">
                    `
                });
        
                if ($uploadTrigger.length) {
                    $uploadTrigger.before($imageItem);
                } else {
                    this.$container.find('.iu-image-list').append($imageItem);
                }
            });
        
            this.updateCountInfo();
            this.triggerChange();

            // 重新初始化 Viewer
            if (this.options.useViewer) {
                this.initViewer();
            }
        }

        // 触发onChange回调
        triggerChange() {
            if (typeof this.options.onChange === 'function') {
                const images = this.getImageList();
                this.options.onChange(images);
            }
        }

        // 获取已上传的图片列表
        getImageList() {
            const images = [];
            this.$container.find('.iu-image-item input[name="imageKeys[]"]').each(function() {
                images.push({
                    key: $(this).val(),
                    url: $(this).closest('.iu-image-item').find('img').attr('src')
                });
            });
            return images;
        }

        // 清空图片列表
        clear() {
            this.$container.find('.iu-image-item').remove();
            this.updateCountInfo();
            this.triggerChange();
        }

        // 销毁实例
        destroy() {
            // 移除事件监听
            this.$container.off();
            this.$fileInput.off();

            // 移除样式表
            $('#image-uploader-styles').remove();

            // 移除上传弹窗
            $('#iu-upload-dialog').remove();

            // 移除文件输入
            this.$fileInput.remove();

            // 清空容器
            this.$container.empty();
            this.$container.removeClass('iu-image-list-container');

            // 销毁 Viewer 实例
            if (this.mainViewer) {
                this.mainViewer.destroy();
            }
            if (this.dialogViewer) {
                this.dialogViewer.destroy();
            }

            // 移除实例引用
            this.$container.removeData('imageUploader');
        }

        formatImageKeys(keyString, baseUrl) {
            if (!keyString) return [];
    
            return keyString.split(';')
                .filter(key => key.trim()) 
                .map(key => ({
                    key: key.trim(),
                    url: baseUrl + key.trim()
                }));
        }
    }

    // 注册 jQuery 插件
    $.fn.imageUploader = function(options, ...args) {
        if (typeof options === 'string') {
            const instance = this.data('imageUploader');
            // 检查方法是否在允许的列表中
            if (instance && METHODS.includes(options) && typeof instance[options] === 'function') {
                return instance[options].apply(instance, args);
            }
            return this;
        }
        
        return this.each(function() {
            if (!$.data(this, 'imageUploader')) {
                $.data(this, 'imageUploader', new ImageUploader(this, options));
            }
        });
    };
})(jQuery);
