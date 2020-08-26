/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*                                                                                 *
*/

jest.mock("@zowe/cli");
jest.mock("@zowe/imperative");
import { createJobsTree, ZosJobsProvider } from "../../../src/job/ZosJobsProvider";
import * as vscode from "vscode";
import * as zowe from "@zowe/cli";
import * as globals from "../../../src/globals";
import * as utils from "../../../src/utils";
import { Logger } from "@zowe/imperative";
import { createIJobFile, createIJobObject, createJobFavoritesNode, createJobSessionNode, MockJobDetail } from "../../../__mocks__/mockCreators/jobs";
import { Job } from "../../../src/job/ZoweJobNode";
import { Profiles, ValidProfileEnum } from "../../../src/Profiles";
import { createIProfile, createISession, createInstanceOfProfile, createISessionWithoutCredentials, createQuickPickContent, createTreeView } from "../../../__mocks__/mockCreators/shared";
import { ZoweExplorerApiRegister } from "../../../src/api/ZoweExplorerApiRegister";
import { getIconByNode } from "../../../src/generators/icons";

async function createGlobalMocks() {
    const globalMocks = {
        mockGetConfiguration: jest.fn(),
        mockGetJobs: jest.fn(),
        mockGetJob: jest.fn(),
        mockRefresh: jest.fn(),
        mockAffectsConfig: jest.fn(),
        createTreeView: jest.fn(),
        mockCreateBasicZosmfSession: jest.fn(),
        mockGetSpoolFiles: jest.fn(),
        mockDeleteJobs: jest.fn(),
        mockShowInputBox: jest.fn(),
        mockDeleteJob: jest.fn(),
        mockGetJobsByOwnerAndPrefix: jest.fn(),
        mockShowInformationMessage: jest.fn(),
        mockLoadNamedProfile: jest.fn(),
        mockCreateQuickPick: jest.fn(),
        mockLoadDefaultProfile: jest.fn(),
        mockGetJesApi: jest.fn(),
        mockShowQuickPick: jest.fn(),
        testJobsProvider: null,
        jesApi: null,
        testSession: createISession(),
        testSessionNoCred: createISessionWithoutCredentials(),
        testProfile: createIProfile(),
        testIJob: createIJobObject(),
        testIJobComplete: createIJobObject(),
        testJobNode: null,
        testSessionNode: null,
        mockIJobFile: createIJobFile(),
        mockProfileInstance: null,
        withProgress: jest.fn().mockImplementation((progLocation, callback) => {
            return callback();
        }),
        ProgressLocation: jest.fn().mockImplementation(() => {
            return {
                Notification: 15
            };
        }),
        enums: jest.fn().mockImplementation(() => {
            return {
                Global: 1,
                Workspace: 2,
                WorkspaceFolder: 3
            };
        })
    };

    Object.defineProperty(vscode, "ProgressLocation", { value: globalMocks.ProgressLocation, configurable: true });
    Object.defineProperty(vscode.window, "withProgress", { value: globalMocks.withProgress, configurable: true });
    Object.defineProperty(zowe, "GetJobs", { value: globalMocks.mockGetJobs, configurable: true });
    Object.defineProperty(vscode.window, "showInformationMessage", { value: globalMocks.mockShowInformationMessage, configurable: true });
    Object.defineProperty(globalMocks.mockGetJobs, "getJob", { value: globalMocks.mockGetJob, configurable: true });
    Object.defineProperty(globalMocks.mockGetJobs, "getJobsByOwnerAndPrefix", { value: globalMocks.mockGetJobsByOwnerAndPrefix, configurable: true });
    Object.defineProperty(zowe.ZosmfSession, "createBasicZosmfSession", { value: globalMocks.mockCreateBasicZosmfSession, configurable: true });
    Object.defineProperty(globalMocks.mockGetJobs, "getSpoolFiles", { value: globalMocks.mockGetSpoolFiles, configurable: true });
    Object.defineProperty(vscode.window, "createTreeView", { value: globalMocks.createTreeView, configurable: true });
    Object.defineProperty(vscode.window, "showQuickPick", { value: globalMocks.mockShowQuickPick, configurable: true });
    Object.defineProperty(vscode, "ConfigurationTarget", { value: globalMocks.enums, configurable: true });
    Object.defineProperty(vscode.window, "showInputBox", { value: globalMocks.mockShowInputBox, configurable: true });
    Object.defineProperty(vscode.workspace, "getConfiguration", { value: globalMocks.mockGetConfiguration, configurable: true });
    Object.defineProperty(Profiles, "getInstance", { value: jest.fn(() => globalMocks.mockProfileInstance), configurable: true });
    Object.defineProperty(zowe, "DeleteJobs", { value: globalMocks.mockDeleteJobs, configurable: true });
    Object.defineProperty(vscode.window, "createQuickPick", { value: globalMocks.mockCreateQuickPick, configurable: true });
    Object.defineProperty(globalMocks.mockDeleteJobs, "deleteJob", { value: globalMocks.mockDeleteJob, configurable: true });

    // Profile instance mocks
    globalMocks.mockProfileInstance = createInstanceOfProfile(globalMocks.testProfile);
    globalMocks.mockGetSpoolFiles.mockReturnValue([globalMocks.mockIJobFile]);
    globalMocks.mockLoadNamedProfile.mockReturnValue(globalMocks.testProfile);
    globalMocks.mockProfileInstance.loadNamedProfile = globalMocks.mockLoadNamedProfile;
    globalMocks.mockLoadDefaultProfile.mockReturnValue(globalMocks.testProfile);
    globalMocks.mockProfileInstance.getDefaultProfile = globalMocks.mockLoadDefaultProfile;

    // Jes API mocks
    globalMocks.jesApi = ZoweExplorerApiRegister.getJesApi(globalMocks.testProfile);
    globalMocks.mockGetJesApi.mockReturnValue(globalMocks.jesApi);
    ZoweExplorerApiRegister.getJesApi = globalMocks.mockGetJesApi.bind(ZoweExplorerApiRegister);

    globalMocks.mockCreateBasicZosmfSession.mockReturnValue(globalMocks.testSession);
    globalMocks.createTreeView.mockReturnValue("testTreeView");
    globalMocks.mockGetJob.mockReturnValue(globalMocks.testIJob);
    globalMocks.mockGetJobsByOwnerAndPrefix.mockReturnValue([globalMocks.testIJob, globalMocks.testIJobComplete]);
    globalMocks.mockProfileInstance.editSession = jest.fn(() => globalMocks.testProfile);
    globalMocks.testJobNode = new Job("jobtest", vscode.TreeItemCollapsibleState.Expanded,
                                      null, globalMocks.testSession, globalMocks.testIJob, globalMocks.testProfile);
    globalMocks.testJobNode.contextValue = "job";
    globalMocks.testJobNode.dirty = true;
    globalMocks.testIJobComplete.jobid = "JOB1235";
    globalMocks.testIJobComplete.retcode = "0";
    globalMocks.testSessionNode = new Job("sestest", vscode.TreeItemCollapsibleState.Collapsed,
                                        null, globalMocks.testSession, null, globalMocks.testProfile);
    globalMocks.testSessionNode.contextValue = globals.JOBS_SESSION_CONTEXT;
    globalMocks.mockGetConfiguration.mockReturnValue({
        persistence: true,
        get: (setting: string) => [],
        // tslint:disable-next-line: no-empty
        update: jest.fn(()=>{ {} })
    });
    globalMocks.testJobsProvider = await createJobsTree(Logger.getAppLogger());
    Object.defineProperty(globalMocks.testJobsProvider, "refresh", { value: globalMocks.mockRefresh, configurable: true });

    return globalMocks;
}

// Idea is borrowed from: https://github.com/kulshekhar/ts-jest/blob/master/src/util/testing.ts
const mocked = <T extends (...args: any[]) => any>(fn: T): jest.Mock<ReturnType<T>> => fn as any;

describe("ZosJobsProvider unit tests - Function getChildren", () => {
    function createBlockMocks() {
        const imperativeProfile = createIProfile();
        const profile = createInstanceOfProfile(imperativeProfile);
        const session = createISession();
        const jobSessionNode = createJobSessionNode(session, imperativeProfile);
        const jobFavoritesNode = createJobFavoritesNode();
        const treeView = createTreeView();
        const testIJob = createIJobObject();

        return {
            profile,
            session,
            jobSessionNode,
            jobFavoritesNode,
            treeView,
            testIJob
        };
    }

    it("Tests that getChildren returns the Favorites and sessions when called at the root node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new ZosJobsProvider();
        testTree.mSessionNodes.push(blockMocks.jobSessionNode);
        const targetIcon = getIconByNode(blockMocks.jobFavoritesNode);
        if (targetIcon) {
            blockMocks.jobFavoritesNode.iconPath = targetIcon.path;
        }

        const children = await testTree.getChildren();

        expect(blockMocks.jobFavoritesNode).toMatchObject(children[0]);
        expect(blockMocks.jobSessionNode).toMatchObject(children[1]);

    });
    it("Tests that getChildren returns favorites profile node when called on Favorites", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);

        const testTree = new ZosJobsProvider();
        const favoriteSessionNode = blockMocks.jobFavoritesNode;
        const favProfileNode = new Job("sestest", vscode.TreeItemCollapsibleState.Collapsed,
            favoriteSessionNode, null, null, null);
        favProfileNode.contextValue = globals.FAV_PROFILE_CONTEXT;
        testTree.mFavorites.push(favProfileNode);

        const children = await testTree.getChildren(favoriteSessionNode);

        expect(children).toEqual([favProfileNode]);
    });
    it("Tests that getChildren gets profile-loaded favorites for profile node in Favorites section ", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);

        const testTree = new ZosJobsProvider();
        const log = Logger.getAppLogger();
        const favProfileNode = new Job("sestest", vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.jobFavoritesNode, null, null, null);
        favProfileNode.contextValue = globals.FAV_PROFILE_CONTEXT;
        testTree.mFavorites.push(favProfileNode);

        const loadProfilesForFavoritesSpy= jest.spyOn(testTree, "loadProfilesForFavorites");

        await testTree.getChildren(favProfileNode);

        expect(loadProfilesForFavoritesSpy).toHaveBeenCalledWith(log, favProfileNode);
    });
    it("Tests that getChildren gets children of a session element", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);

        const testTree = new ZosJobsProvider();
        testTree.mSessionNodes.push(blockMocks.jobSessionNode);
        testTree.mSessionNodes[1].dirty = true;
        const sessionElement = testTree.mSessionNodes[1];
        const elementGetChildrenSpy = jest.spyOn(sessionElement, "getChildren");

        await testTree.getChildren(testTree.mSessionNodes[1]);

        expect(elementGetChildrenSpy).toHaveBeenCalledTimes(1);
    });
});

describe("ZosJobsProvider unit tests - Function initializeFavChildNodeForProfile", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const jobSessionNode = createJobSessionNode(session, imperativeProfile);
        const jobFavoritesNode = createJobFavoritesNode();

        return {
            imperativeProfile,
            session,
            jobSessionNode,
            jobFavoritesNode
        };
    }
    it("Checks that profile-less node is initiated for favorited Job", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const testTree = new ZosJobsProvider();

        const favProfileNode = new Job("testProfile", vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.jobFavoritesNode, null, null, null);
        favProfileNode.contextValue = globals.FAV_PROFILE_CONTEXT;
        const node = new Job("testJob(JOB123)", vscode.TreeItemCollapsibleState.Collapsed,
            favProfileNode, null, new MockJobDetail("testJob(JOB123)"), null);
        node.contextValue = globals.JOBS_JOB_CONTEXT + globals.FAV_SUFFIX;
        node.command = {command: "zowe.zosJobsSelectjob", title: "", arguments: [node]};
        const targetIcon = getIconByNode(node);
        if (targetIcon) {
            node.iconPath = targetIcon.path;
        }

        const favChildNodeForProfile = await testTree.initializeFavChildNodeForProfile("testJob(JOB123)", globals.JOBS_JOB_CONTEXT, favProfileNode);

        expect(favChildNodeForProfile).toEqual(node);
    });
    it("Checks that profile-less node is initiated for favorited search", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const testTree = new ZosJobsProvider();

        const favProfileNode = new Job("testProfile", vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.jobFavoritesNode, null, null, null);
        favProfileNode.contextValue = globals.FAV_PROFILE_CONTEXT;
        const node = new Job("Owner:USER Prefix:*", vscode.TreeItemCollapsibleState.None,
            testTree.mFavoriteSession, null, null, null);
        node.command = {command: "zowe.jobs.search", title: "", arguments: [node]};
        node.contextValue = globals.JOBS_SESSION_CONTEXT + globals.FAV_SUFFIX;
        const targetIcon = getIconByNode(node);
        if (targetIcon) {
            node.iconPath = targetIcon.path;
        }

        const favChildNodeForProfile = await testTree.initializeFavChildNodeForProfile(
            "Owner:USER Prefix:*", globals.JOBS_SESSION_CONTEXT, favProfileNode
            );

        expect(favChildNodeForProfile).toEqual(node);
    });
});
