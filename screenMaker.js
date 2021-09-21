const robot = require("robotjs");
const path = require('path');
const Jimp = require('jimp');
const fs = require('fs');
const resemble = require('resemblejs');
const { exit } = require("process");


// Папка Documents -> GDrive -> AutoScreens -> [Название предмета]
// node C:\Users\username\IdeaProjects\mephi\src\screenMaker.js [предмет] [секунд между проверками] [процент расхождения допустимый] [длительность сеанса минут] 

const screensDir =  path.resolve('Documents','GDrive','AutoScreens', process.argv[2], Date.now().toString())
const candidatePath = path.resolve(screensDir, 'candidate.jpg') 

const generateNewImagePath = () => path.resolve(screensDir, `${Date.now().toString()}.jpg`) 

const screenCaptureToFile2 = (robotScreenPic, path) => 
     new Promise((resolve, reject) => {
        try {
            const image = new Jimp(robotScreenPic.width, robotScreenPic.height);
            let pos = 0;
            image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
                image.bitmap.data[idx + 2] = robotScreenPic.image.readUInt8(pos++);
                image.bitmap.data[idx + 1] = robotScreenPic.image.readUInt8(pos++);
                image.bitmap.data[idx + 0] = robotScreenPic.image.readUInt8(pos++);
                image.bitmap.data[idx + 3] = robotScreenPic.image.readUInt8(pos++);
            });
            image.write(path, resolve);
        } catch (e) {
            console.error(e);
            reject(e);
        }
    });


const getSortedFiles = async (dir) => {
    const files = await fs.promises.readdir(dir);
  
    return files
      .map(fileName => ({
        name: fileName,
        time: fs.statSync(`${dir}/${fileName}`).mtime.getTime(),
      }))
      .sort((a, b) => a.time - b.time)
      .map(file => file.name);
  };
  

const renameApprovedCandidate =() => {
    fs.rename(candidatePath, generateNewImagePath(), (err) => {
        console.log(err);
      });
}

const writeFileIfNeed = (file,file2) => {
    resemble(file)
    .compareTo(file2)
    .ignoreColors()
    .onComplete(function (data) {
        if (data.rawMisMatchPercentage >  process.argv[4]){
            renameApprovedCandidate()
        } else {
            fs.unlinkSync(candidatePath);
        }
    });
}

const handleFreshFiles = (files) => {
   files.length > 1 
    ?   writeFileIfNeed(candidatePath, path.resolve(screensDir, files[files.length - 2]) )
    :   renameApprovedCandidate()
}


const run = async  () => {
    const pic = robot.screen.capture(0, 0, 1920, 1080);
    await screenCaptureToFile2(pic, candidatePath)

    Promise.resolve()
    .then(() => getSortedFiles(screensDir))
    .then(handleFreshFiles)
    .catch(console.error);
}

const intervalID = setInterval(run, process.argv[3] * 1000)

setTimeout(() => {
    clearInterval(intervalID)
    exit(0)
}, process.argv[5] * 60 * 1000)

