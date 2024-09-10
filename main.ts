import { Plugin, PluginSettingTab, Setting, Notice, FileSystemAdapter} from 'obsidian';
import { NodeSSH } from 'node-ssh';

interface ScpNoteUploadSettings {
  serverAddress: string;
  username: string;
  password: string;
  remotePath: string;
}


const DEFAULT_SETTINGS: ScpNoteUploadSettings = {
  serverAddress: '',
  username: '',
  password: '',
  remotePath: ''
};

export default class ScpNoteUpload extends Plugin {
  settings: ScpNoteUploadSettings;

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: 'upload-current-file',
      name: 'Upload Current File via SCP',
      callback: () => this.uploadCurrentFile(),
    });

    this.addSettingTab(new ScpNoteUploadSettingTab(this.app, this));
  }


async uploadCurrentFile() {
  const activeFile = this.app.workspace.getActiveFile()
  if (!activeFile) {
    console.error('No active file');
	new Notice("No active file!");
    return;
  }
  let filePath  = ""
if (this.app.vault.adapter instanceof FileSystemAdapter) {
  filePath = this.app.vault.adapter.getFullPath(activeFile.path);
}

  let vaultName = this.app.vault.getName();
  let relativeIndex = filePath.lastIndexOf(vaultName);
  if (relativeIndex === -1) {
    console.error('Vault name not found in file path');
    return;
  }
  let relativePath = filePath.substring(relativeIndex + vaultName.length + 1);

  const ssh = new NodeSSH()
  try {
    await ssh.connect({
      host: this.settings.serverAddress,
      username: this.settings.username,
      password: this.settings.password,
    });
    // Create directory if it doesn't exist
    await ssh.execCommand(`mkdir -p ${this.settings.remotePath}`);

    // Upload the temporary file
    await ssh.putFile(filePath, `${this.settings.remotePath}/${relativePath}`);
    console.log(`File ${activeFile.name} uploaded successfully`);
	new Notice(`File ${activeFile.name} uploaded successfully`);
  } catch (err) {
    console.error('Error uploading file:', err);
    new Notice('Error uploading file:', err);
  } finally {
    ssh.dispose();
  }
}

  onunload() {
    console.log('Unloading ScpNoteUpload');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class ScpNoteUploadSettingTab extends PluginSettingTab {
  plugin: ScpNoteUpload;

  constructor(app: any, plugin: ScpNoteUpload) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'Settings for SCP Note upload plugin' });

    new Setting(containerEl)
      .setName('Server Address')
      .setDesc('The address of the server to upload files to.')
      .addText(text => text
        .setPlaceholder('example.com')
        .setValue(this.plugin.settings.serverAddress)
        .onChange(async (value) => {
          this.plugin.settings.serverAddress = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Username')
      .setDesc('The username for SCP authentication.')
      .addText(text => text
        .setPlaceholder('your-username')
        .setValue(this.plugin.settings.username)
        .onChange(async (value) => {
          this.plugin.settings.username = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Password')
      .setDesc('The password for SCP authentication.')
      .addText(text => text
        .setPlaceholder('your-password')
        .setValue(this.plugin.settings.password)
        .onChange(async (value) => {
          this.plugin.settings.password = value;
          await this.plugin.saveSettings();
        }));

		// Target path for uploaded files
		new Setting(containerEl)
			.setName('Remote Path')
			.setDesc('The path on the remote server to upload files to.')
			.addText(text => text
				.setPlaceholder('/path/on/remote/server')
				.setValue(this.plugin.settings.remotePath)
				.onChange(async (value) => {
					this.plugin.settings.remotePath = value;
					await this.plugin.saveSettings
				}
			));
			  }
}
